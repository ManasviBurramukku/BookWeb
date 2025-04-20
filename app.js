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
// Add these at the top with other middleware
app.use(bodyParser.json());

// DB Config
const dbConfig = {
  user: 'manasvi',
  password: 'abcd',
  connectString: 'localhost/free'
};
// DB Config for ananya
// const dbConfig = {
//   user: 'sys',
//   password: 'abcd',
//   connectString: 'localhost/free',
//   privilege: require('oracledb').SYSDBA // or SYSOPER
// };

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
// app.get('/book/:id', async (req, res) => {
//   const bookId = req.params.id;
//   const userId = req.session.userId;
//   const sort = req.query.sort || 'recent'; // Get sort parameter or default to 'recent'
//   let connection;

//   try {
//     connection = await oracledb.getConnection(dbConfig);

//     // 1. Get book details
//     const bookResult = await connection.execute(
//       `SELECT book_id, title, author, genre, image, description, 
//               NVL(rating, 0) as rating 
//        FROM books 
//        WHERE book_id = :bookId`,
//       { bookId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     if (bookResult.rows.length === 0) {
//       return res.status(404).send("Book not found");
//     }

//     const book = bookResult.rows[0];

//     // 2. Determine sort order
//     let orderBy;
//     switch(sort) {
//       case 'high':
//         orderBy = 'r.rating DESC, r.date_reviewed DESC';
//         break;
//       case 'low':
//         orderBy = 'r.rating ASC, r.date_reviewed DESC';
//         break;
//       case 'recent':
//       default:
//         orderBy = 'r.date_reviewed DESC';
//     }

//     // 3. Get reviews with sorting and date_reviewed
//     const reviewsResult = await connection.execute(
//       `SELECT r.review_id, r.book_id, r.user_id, r.rating, 
//               r.likes, r.dislikes, u.name,
//               DBMS_LOB.SUBSTR(r.review, 4000, 1) as review_text,
//               r.date_reviewed
//        FROM reviews r
//        JOIN users u ON r.user_id = u.user_id
//        WHERE r.book_id = :bookId
//        ORDER BY ${orderBy}`,
//       { bookId },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     res.render('book', {
//       book,
//       reviews: reviewsResult.rows,
//       userId,
//       currentSort: sort // Pass current sort option to view
//     });

//   } catch (err) {
//     console.error('Database error:', err);
//     res.status(500).send("Internal Server Error");
//   } finally {
//     if (connection) await connection.close();
//   }
// });

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

// Add this new route to handle saving/unsaving books
app.post('/book/:id/save', async (req, res) => {
  const bookId = req.params.id;
  const userId = req.session.userId;
  
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Check if already saved
    const checkResult = await connection.execute(
      `SELECT 1 FROM saved_books WHERE user_id = :userId AND book_id = :bookId`,
      { userId, bookId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows.length > 0) {
      // Already saved - remove it
      await connection.execute(
        `DELETE FROM saved_books WHERE user_id = :userId AND book_id = :bookId`,
        { userId, bookId }
      );
      await connection.commit();
      return res.json({ saved: false });
    } else {
      // Not saved - add it
      const nextIdResult = await connection.execute(
        `SELECT NVL(MAX(save_id), 0) + 1 AS next_id FROM saved_books`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const nextId = nextIdResult.rows[0].NEXT_ID;

      await connection.execute(
        `INSERT INTO saved_books (save_id, user_id, book_id) 
         VALUES (:nextId, :userId, :bookId)`,
        { nextId, userId, bookId }
      );
      await connection.commit();
      return res.json({ saved: true });
    }
  } catch (err) {
    console.error('Save error:', err);
    if (connection) await connection.rollback();
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) await connection.close();
  }
});

// Update your existing book route to include the saved status check
app.get('/book/:id', async (req, res) => {
  const bookId = req.params.id;
  const userId = req.session.userId;
  const sort = req.query.sort || 'recent';
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

    // 2. Check if book is saved by this user
    let isSaved = false;
    if (userId) {
      const savedResult = await connection.execute(
        `SELECT 1 FROM saved_books WHERE user_id = :userId AND book_id = :bookId`,
        { userId, bookId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      isSaved = savedResult.rows.length > 0;
    }

    // 3. Determine sort order for reviews
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

    // 4. Get reviews with sorting and date_reviewed
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
      currentSort: sort,
      isSaved: isSaved // Pass the saved status to the view
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});
//merchandise

app.get('/merchandise', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Get user's total points
    const userPointsResult = await connection.execute(
      `SELECT total_points FROM users WHERE user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const totalPoints = userPointsResult.rows[0]?.TOTAL_POINTS || 0;

    // Get all merchandise items
    const merchandiseResult = await connection.execute(
      `SELECT merch_id, name, points_required, image_url FROM merchandise`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const merchandise = merchandiseResult.rows;
    // console.log(merchandise)
    res.render('merchandise', { userPoints: totalPoints, 
      merchandise,
      userId: req.session.userId,
      error: req.query.error,
      success: req.query.success});
  } catch (err) {
    console.error('Error fetching merchandise or user points:', err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});

//reedem
// Update the redeem route
app.post('/redeem/:id', async (req, res) => {
  console.log('Request body:', req.body);
  const userId = req.session.userId;
  const merchId = req.params.id;
  const { fullName, address } = req.body;

  if (!userId) return res.redirect('/login');

  // Basic validation
  if (!fullName || !address) {
    return res.redirect(`/merchandise?error=MissingFields`);
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Fetch item cost and name
    const merchResult = await connection.execute(
      `SELECT name, points_required FROM merchandise WHERE merch_id = :merchId`,
      { merchId: merchId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (merchResult.rows.length === 0) {
      return res.redirect('/merchandise?error=ItemNotFound');
    }

    const merchName = merchResult.rows[0].NAME;
    const requiredPoints = merchResult.rows[0].POINTS_REQUIRED;

    // Fetch user points and email
    const userResult = await connection.execute(
      `SELECT total_points, email FROM users WHERE user_id = :userId`,
      { userId: userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const currentPoints = userResult.rows[0]?.TOTAL_POINTS ?? 0;
    const userEmail = userResult.rows[0]?.EMAIL;

    if (currentPoints < requiredPoints) {
      return res.redirect('/merchandise?error=NotEnoughPoints');
    }

    // Generate a new redemption_id - FIXED THIS PART
    const idResult = await connection.execute(
      `SELECT NVL(MAX(redemption_id), 0) + 1 AS next_id FROM redemptions`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const newRedemptionId = idResult.rows[0].NEXT_ID;

    // Deduct points
    await connection.execute(
      `UPDATE users SET total_points = total_points - :pointsRequired WHERE user_id = :userId`,
      { 
        pointsRequired: requiredPoints, 
        userId: userId 
      }
    );

    // Insert into redemptions with address info
    await connection.execute(
      `INSERT INTO redemptions (redemption_id, user_id, merch_id, recipient_name, shipping_address) 
       VALUES (:redemptionId, :userId, :merchId, :recipientName, :shippingAddress)`,
      { 
        redemptionId: newRedemptionId, 
        userId: userId, 
        merchId: merchId,
        recipientName: fullName,
        shippingAddress: address
      }
    );

    await connection.commit();

    console.log(`Email would be sent to ${userEmail} about ${merchName} redemption`);
    res.redirect('/merchandise?success=1');
  } catch (err) {
    console.error('Redemption error:', err);
    if (connection) await connection.rollback();
    res.redirect('/merchandise?error=RedemptionFailed');
  } finally {
    if (connection) await connection.close();
  }
});

//fanart
// Fanart Route
app.get('/fanart', (req, res) => {
  const fanarts = [
    {
      img: "https://via.placeholder.com/300x200?text=Fanart+1",
      title: "Beautiful Scene",
      description: "A fanart from the story.",
      link: "#"
    },
    {
      img: "https://via.placeholder.com/300x200?text=Fanart+2",
      title: "Epic Battle",
      description: "An action-packed fan drawing.",
      link: "#"
    },
    {
      img: "https://via.placeholder.com/300x200?text=Fanart+3",
      title: "Character Art",
      description: "A portrait of a popular character.",
      link: "#"
    }
  ];

  res.render('fanart', { fanarts });
});


app.get('/leaderboard', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    const result = await connection.execute(
      `SELECT u.name, NVL(SUM(r.likes), 0) AS total_likes
       FROM users u
       LEFT JOIN reviews r ON u.user_id = r.user_id
       GROUP BY u.name
       ORDER BY total_likes DESC
       FETCH FIRST 10 ROWS ONLY`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      name: row.NAME,
      total_likes: row.TOTAL_LIKES || 0
    }));

    res.render('leaderboard', { 
      leaderboard,
      userId: req.session.userId  // Pass userId to the view if needed
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).render('error', { message: 'Error loading leaderboard' });
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

// Profile route
app.get('/profile', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // 1. Get user info
    const userResult = await connection.execute(
      `SELECT name, email, total_points FROM users WHERE user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).send("User not found");
    }
    const user = userResult.rows[0];

    // 2. Get saved books
    const savedBooksResult = await connection.execute(
      `SELECT b.book_id, b.title, b.author, b.image 
       FROM saved_books sb
       JOIN books b ON sb.book_id = b.book_id
       WHERE sb.user_id = :userId
       ORDER BY sb.saved_date DESC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const savedBooks = savedBooksResult.rows;

    // 3. Get reading activity (books reviewed)
    const activityResult = await connection.execute(
      `SELECT COUNT(DISTINCT book_id) as books_read 
       FROM reviews 
       WHERE user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const booksRead = activityResult.rows[0]?.BOOKS_READ || 0;

    // 4. Get recent reviews (last 10)
    const reviewsResult = await connection.execute(
      `SELECT r.review_id, b.book_id, b.title, 
              DBMS_LOB.SUBSTR(r.review, 4000, 1) as review_text,
              r.rating, r.date_reviewed
       FROM reviews r
       JOIN books b ON r.book_id = b.book_id
       WHERE r.user_id = :userId
       ORDER BY r.date_reviewed DESC
       FETCH FIRST 10 ROWS ONLY`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const recentReviews = reviewsResult.rows;

    res.render('profile', {
      user,
      savedBooks,
      booksRead,
      recentReviews
    });

  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});

// Community routes
app.get('/community', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Get all community channels
    const channelsResult = await connection.execute(
      `SELECT c.channel_id, c.name, c.description, c.created_at, 
              u.name as creator_name, 
              COUNT(cm.comment_id) as comment_count
       FROM community_channels c
       JOIN users u ON c.created_by = u.user_id
       LEFT JOIN community_comments cm ON c.channel_id = cm.channel_id
       GROUP BY c.channel_id, c.name, c.description, c.created_at, u.name
       ORDER BY c.created_at DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.render('community', { 
      channels: channelsResult.rows,
      userId: req.session.userId 
    });
  } catch (err) {
    console.error('Community error:', err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});

app.get('/community/channel/:id', async (req, res) => {
  const channelId = req.params.id;
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Get channel info
    const channelResult = await connection.execute(
      `SELECT c.channel_id, c.name, c.description, c.created_at, 
              u.name as creator_name
       FROM community_channels c
       JOIN users u ON c.created_by = u.user_id
       WHERE c.channel_id = :channelId`,
      { channelId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (channelResult.rows.length === 0) {
      return res.status(404).send("Channel not found");
    }

    // Get comments for this channel
    const commentsResult = await connection.execute(
      `SELECT cm.comment_id, cm.comment_text, cm.created_at,
              u.user_id, u.name as user_name
       FROM community_comments cm
       JOIN users u ON cm.user_id = u.user_id
       WHERE cm.channel_id = :channelId
       ORDER BY cm.created_at DESC`,
      { channelId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.render('community-channel', {
      channel: channelResult.rows[0],
      comments: commentsResult.rows,
      userId: req.session.userId
    });
  } catch (err) {
    console.error('Channel error:', err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/community/channel/create', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  const { name, description } = req.body;
  if (!name) return res.status(400).send("Channel name is required");

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Get next channel ID
    const nextIdResult = await connection.execute(
      `SELECT channel_seq.NEXTVAL FROM dual`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const nextId = nextIdResult.rows[0].NEXTVAL;

    // Create new channel
    await connection.execute(
      `INSERT INTO community_channels (channel_id, name, description, created_by)
       VALUES (:channelId, :name, :description, :userId)`,
      {
        channelId: nextId,
        name: name.trim(),
        description: description ? description.trim() : null,
        userId
      }
    );

    await connection.commit();
    res.redirect(`/community/channel/${nextId}`);
  } catch (err) {
    console.error('Create channel error:', err);
    if (connection) await connection.rollback();
    res.status(500).send("Error creating channel");
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/community/channel/:id/comment', async (req, res) => {
  const channelId = req.params.id;
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  const { commentText } = req.body;
  if (!commentText) return res.status(400).send("Comment text is required");

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Get next comment ID
    const nextIdResult = await connection.execute(
      `SELECT comment_seq.NEXTVAL FROM dual`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const nextId = nextIdResult.rows[0].NEXTVAL;

    // Add new comment
    await connection.execute(
      `INSERT INTO community_comments (comment_id, channel_id, user_id, comment_text)
       VALUES (:commentId, :channelId, :userId, :commentText)`,
      {
        commentId: nextId,
        channelId,
        userId,
        commentText: commentText.trim()
      }
    );

    await connection.commit();
    res.redirect(`/community/channel/${channelId}`);
  } catch (err) {
    console.error('Add comment error:', err);
    if (connection) await connection.rollback();
    res.status(500).send("Error adding comment");
  } finally {
    if (connection) await connection.close();
  }
});


// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});
// Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
