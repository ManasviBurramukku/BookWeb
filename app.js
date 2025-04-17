const express = require('express');
const path = require('path');
const oracledb = require('oracledb');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false
}));

// DB Config
const dbConfig = {
  user: 'manasvi',
  password: 'abcd',
  connectString: 'localhost/free'
};

// Routes
app.get('/', (req, res) => res.render('landing'));

// Login
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT user_id FROM users WHERE LOWER(email) = LOWER(:email) AND TRIM(pass) = TRIM(:password)`,
      { email: email.trim(), password: password.trim() },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Login attempt:', email, password);
  console.log('Query result:', result);

    if (result.rows.length > 0) {
      req.session.userId = result.rows[0].USER_ID;
      res.redirect('/home');
    } else {
      res.render('login', { error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Database error occurred' });
  } finally {
    if (connection) await connection.close();
  }
});

// Signup
app.get('/signup', (req, res) => {
  res.render('signup', { error: null, name: '', email: '' });
});

app.post('/signup', async (req, res) => {
    const { name, email, password, confirm_password } = req.body;
    
    // Input validation
    if (!name || !email || !password || !confirm_password) {
      return res.render('signup', {
        error: 'All fields are required',
        name,
        email
      });
    }
  
    if (password !== confirm_password) {
      return res.render('signup', {
        error: 'Passwords do not match',
        name,
        email
      });
    }
  
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);
  
      // Check if email exists
      const check = await connection.execute(
        `SELECT user_id FROM users WHERE LOWER(email) = LOWER(:email)`,
        { email: email.trim().toLowerCase() },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
  
      if (check.rows.length > 0) {
        return res.render('signup', {
          error: 'Email already exists',
          name,
          email
        });
      }
  
      // Get next user_id
      const nextIdResult = await connection.execute(
        'SELECT NVL(MAX(user_id), 0) + 1 AS next_id FROM users',
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const nextId = nextIdResult.rows[0].NEXT_ID;
  
      // Insert new user
      await connection.execute(
        `INSERT INTO users (user_id, name, email, pass, total_points, last_reviewed_book_id)
         VALUES (:user_id, :name, :email, :password, 0, NULL)`,
        {
          user_id: nextId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim()
        }
      );
  
      await connection.commit();
  
      req.session.userId = nextId;
      return res.redirect('/home');
    } catch (err) {
      console.error('Signup error:', err);
      await connection.rollback();
      return res.render('signup', {
        error: 'Database error occurred',
        name,
        email
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Error closing connection:', err);
        }
      }
    }
  });

// Home
app.get('/home', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const genreResult = await connection.execute(
      `SELECT b.genre FROM books b
       JOIN users u ON b.book_id = u.last_reviewed_book_id
       WHERE u.user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const genre = genreResult.rows[0]?.GENRE;

    const similarBooks = genre ? await connection.execute(
      `SELECT * FROM books 
       WHERE genre = :genre 
       AND book_id != (SELECT last_reviewed_book_id FROM users WHERE user_id = :userId)
       FETCH FIRST 5 ROWS ONLY`,
      { genre, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ) : { rows: [] };

    const randomBooks = await connection.execute(
      `SELECT * FROM (
         SELECT * FROM books ORDER BY DBMS_RANDOM.VALUE
       ) WHERE ROWNUM <= 5`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const userResult = await connection.execute(
      `SELECT name, email, total_points FROM users WHERE user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.render('home', {
      user: userResult.rows[0],
      similarBooks: similarBooks.rows,
      randomBooks: randomBooks.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});


// Search route
app.post('/search', async (req, res) => {
  const { searchQuery } = req.body;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT book_id, title FROM books WHERE LOWER(title) LIKE LOWER(:searchQuery)`,
      { searchQuery: `%${searchQuery}%` },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length > 0) {
      res.redirect(`/book/${result.rows[0].BOOK_ID}`);
    } else {
      res.render('search-results', { 
        searchQuery,
        message: 'No books found matching your search',
        books: []
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});

// Book details route
app.get('/book/:id', async (req, res) => {
  const bookId = req.params.id;
  const userId = req.session.userId;
  const sort = req.query.sort || 'recent'; // Get sort parameter or default to 'recent'
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // 1. Get book details
    const bookResult = await connection.execute(
      `SELECT book_id, title, author, genre, image, description, 
              NVL(rating, 0) as rating 
       FROM books 
       WHERE book_id = :bookId`,
      { bookId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found");
    }

    const book = bookResult.rows[0];

    // 2. Determine sort order
    let orderBy;
    switch(sort) {
      case 'high':
        orderBy = 'r.rating DESC, r.date_reviewed DESC';
        break;
      case 'low':
        orderBy = 'r.rating ASC, r.date_reviewed DESC';
        break;
      case 'recent':
      default:
        orderBy = 'r.date_reviewed DESC';
    }

    // 3. Get reviews with sorting and date_reviewed
    const reviewsResult = await connection.execute(
      `SELECT r.review_id, r.book_id, r.user_id, r.rating, 
              r.likes, r.dislikes, u.name,
              DBMS_LOB.SUBSTR(r.review, 4000, 1) as review_text,
              r.date_reviewed
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.book_id = :bookId
       ORDER BY ${orderBy}`,
      { bookId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.render('book', {
      book,
      reviews: reviewsResult.rows,
      userId,
      currentSort: sort // Pass current sort option to view
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/book/:id/review', async (req, res) => {
  const bookId = req.params.id;
  const userId = req.session.userId;
  const { rating, review } = req.body;

  if (!userId) return res.redirect('/login');
  if (!rating || !review) return res.status(400).send("Rating and review text are required");

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // 1. Get the next review ID
    const nextIdResult = await connection.execute(
      `SELECT NVL(MAX(review_id), 0) + 1 AS next_id FROM reviews`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const nextId = nextIdResult.rows[0].NEXT_ID;

    // 2. First insert the review with empty CLOB
    await connection.execute(
      `INSERT INTO reviews (review_id, book_id, user_id, rating, review, likes, dislikes, date_reviewed)
       VALUES (:nextId, :bookId, :userId, :rating, EMPTY_CLOB(), 0, 0, SYSTIMESTAMP)`,
      { nextId, bookId, userId, rating }
    );

    // 3. Now select the CLOB for updating
    const result = await connection.execute(
      `SELECT review FROM reviews WHERE review_id = :reviewId FOR UPDATE`,
      { reviewId: nextId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 4. Write to the CLOB
    const lob = result.rows[0].REVIEW;
    await lob.write(review);

    // 5. Update user info
    await connection.execute(
      `UPDATE users SET 
         last_reviewed_book_id = :bookId,
         total_points = total_points + 10 
       WHERE user_id = :userId`,
      { bookId, userId }
    );

    await connection.commit();
    res.redirect(`/book/${bookId}?sort=recent`); 

  } catch (err) {
    console.error('Review submission error:', err);
    if (connection) await connection.rollback();
    res.status(500).send("Error submitting review: " + err.message);
  } finally {
    if (connection) await connection.close();
  }
});
// Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});