const express = require('express');
const path = require('path');
const oracledb = require('oracledb');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const saltRounds = 12;

const app = express();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "iit2023026@iiita.ac.in", // Replace with your email
    pass: "wugl cnbw ggqf puzc", // Replace with your app password
  },
});

// Temporary storage for OTPs and pending users
const pendingUsers = new Map();

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
app.use(bodyParser.json());

// DB Config
const dbConfig = {
  user: 'manasvi',
  password: 'abcd',
  connectString: 'localhost/free'
};

// Routes
app.get('/', (req, res) => res.render('landing'));

// Login (unchanged)
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT user_id, pass FROM users WHERE LOWER(email) = LOWER(:email)`,
      { email: email.trim() },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password.trim(), user.PASS);

    if (passwordMatch) {
      req.session.userId = user.USER_ID;
      return res.redirect('/home');
    } else {
      return res.render('login', { error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Database error occurred' });
  } finally {
    if (connection) await connection.close();
  }
});

// Signup with OTP verification
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

  if (password.length < 8) {
    return res.render('signup', {
      error: 'Password must be at least 8 characters',
      name,
      email
    });
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Check if email exists in actual users
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

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);

    // Store user data temporarily with OTP
    pendingUsers.set(email, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      hashedPassword,
      otp,
      expiresAt: Date.now() + 15 * 60 * 1000 // OTP valid for 15 minutes
    });

    // Send OTP email
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Your OTP for BookWeb Verification',
      text: `Your OTP is: ${otp}\nThis OTP is valid for 15 minutes.`,
      html: `<p>Your OTP is: <strong>${otp}</strong></p><p>This OTP is valid for 15 minutes.</p>`
    };

    await transporter.sendMail(mailOptions);

    // Redirect to OTP verification page
    return res.redirect(`/verify-otp?email=${encodeURIComponent(email)}`);

  } catch (err) {
    console.error('Signup error:', err);
    return res.render('signup', {
      error: 'Error during signup process',
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

// OTP Verification Page
app.get('/verify-otp', (req, res) => {
  const email = req.query.email;
  if (!email || !pendingUsers.has(email)) {
    return res.redirect('/signup');
  }
  res.render('verify-otp', { email, error: null });
});

app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp || !pendingUsers.has(email)) {
    return res.redirect('/signup');
  }

  const pendingUser = pendingUsers.get(email);

  // Check if OTP is expired
  if (pendingUser.expiresAt < Date.now()) {
    pendingUsers.delete(email);
    return res.render('verify-otp', {
      email,
      error: 'OTP has expired. Please sign up again.'
    });
  }

  // Verify OTP
  if (otp !== pendingUser.otp) {
    return res.render('verify-otp', {
      email,
      error: 'Invalid OTP. Please try again.'
    });
  }

  // OTP is valid - proceed with user creation
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

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
        name: pendingUser.name,
        email: pendingUser.email,
        password: pendingUser.hashedPassword
      }
    );

    await connection.commit();

    // Clean up
    pendingUsers.delete(email);

    // Set session and redirect
    req.session.userId = nextId;
    return res.redirect('/home');
  } catch (err) {
    console.error('User creation error:', err);
    if (connection) await connection.rollback();
    return res.render('verify-otp', {
      email,
      error: 'Error creating account. Please try again.'
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

// Resend OTP
app.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  
  if (!email || !pendingUsers.has(email)) {
    return res.redirect('/signup');
  }

  const pendingUser = pendingUsers.get(email);

  // Generate new OTP
  const newOtp = crypto.randomInt(100000, 999999).toString();
  pendingUser.otp = newOtp;
  pendingUser.expiresAt = Date.now() + 15 * 60 * 1000; // Reset expiration

  try {
    // Send new OTP email
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Your New OTP for BookWeb Verification',
      text: `Your new OTP is: ${newOtp}\nThis OTP is valid for 15 minutes.`,
      html: `<p>Your new OTP is: <strong>${newOtp}</strong></p><p>This OTP is valid for 15 minutes.</p>`
    };

    await transporter.sendMail(mailOptions);
    return res.redirect(`/verify-otp?email=${encodeURIComponent(email)}&resent=true`);
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.render('verify-otp', {
      email,
      error: 'Error resending OTP. Please try again.'
    });
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
// app.get('/fanart', (req, res) => {
//   const fanarts = [
//     {
//       img: "https://via.placeholder.com/300x200?text=Fanart+1",
//       title: "Beautiful Scene",
//       description: "A fanart from the story.",
//       link: "#"
//     },
//     {
//       img: "https://via.placeholder.com/300x200?text=Fanart+2",
//       title: "Epic Battle",
//       description: "An action-packed fan drawing.",
//       link: "#"
//     },
//     {
//       img: "https://via.placeholder.com/300x200?text=Fanart+3",
//       title: "Character Art",
//       description: "A portrait of a popular character.",
//       link: "#"
//     }
//   ];

//   res.render('fanart', { fanarts });
// });


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
    // In your /profile route, add this query after the other queries
    const channelsResult = await connection.execute(
      `SELECT c.channel_id, c.name, c.description, c.created_at,
              COUNT(cm.comment_id) as comment_count
      FROM community_channels c
      LEFT JOIN community_comments cm ON c.channel_id = cm.channel_id
      WHERE c.created_by = :userId
      GROUP BY c.channel_id, c.name, c.description, c.created_at
      ORDER BY c.created_at DESC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const userChannels = channelsResult.rows;

    // Then add userChannels to your render parameters:
    res.render('profile', {
      user,
      savedBooks,
      booksRead,
      recentReviews,
      userChannels
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

// Book catalog route
app.get('/catalog', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Get all books
    const booksResult = await connection.execute(
      `SELECT book_id, title, author, genre, image, rating 
       FROM books 
       ORDER BY title`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Get all unique genres for filter
    const genresResult = await connection.execute(
      `SELECT DISTINCT genre FROM books ORDER BY genre`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.render('catalog', {
      books: booksResult.rows,
      genres: genresResult.rows.map(g => g.GENRE),
      userId: req.session.userId
    });
  } catch (err) {
    console.error('Catalog error:', err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});

// Search books route (AJAX endpoint)
app.get('/catalog/search', async (req, res) => {
  const { query, genre } = req.query;
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    let sql = `SELECT book_id, title, author, genre, image, rating 
               FROM books 
               WHERE 1=1`;
    const binds = {};

    if (query) {
      sql += ` AND (LOWER(title) LIKE LOWER(:query) OR LOWER(author) LIKE LOWER(:query))`;
      binds.query = `%${query}%`;
    }

    if (genre && genre !== 'all') {
      sql += ` AND genre = :genre`;
      binds.genre = genre;
    }

    sql += ` ORDER BY title`;

    const result = await connection.execute(
      sql,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ books: result.rows });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) await connection.close();
  }
});

// Add multer for file upload handling
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Fanart Routes
app.get('/fanart', async (req, res) => {
  const userId = req.session.userId;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Get all fanart with book and user info
    const fanartResult = await connection.execute(
      `SELECT f.fanart_id, f.image_name, f.character_name, f.upload_date,
              b.book_id, b.title as book_title, b.image as book_image,
              u.user_id, u.name as user_name
       FROM fanart f
       LEFT JOIN books b ON f.book_id = b.book_id
       JOIN users u ON f.user_id = u.user_id
       ORDER BY f.upload_date DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Get all books for the search dropdown
    const booksResult = await connection.execute(
      `SELECT book_id, title FROM books ORDER BY title`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Get all unique characters for the search dropdown
    const charactersResult = await connection.execute(
      `SELECT DISTINCT character_name FROM fanart WHERE character_name IS NOT NULL ORDER BY character_name`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.render('fanart', {
      fanarts: fanartResult.rows,
      books: booksResult.rows,
      characters: charactersResult.rows.map(c => c.CHARACTER_NAME),
      userId: userId,
      searchParams: {} // Initialize as empty object or with default values
    });
  } catch (err) {
    console.error('Fanart error:', err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});

// Route to serve fanart images
app.get('/fanart/image/:id', async (req, res) => {
  const fanartId = req.params.id;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT image_data FROM fanart WHERE fanart_id = :fanartId`,
      { fanartId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0 || !result.rows[0].IMAGE_DATA) {
      return res.status(404).send('Image not found');
    }

    const image = result.rows[0].IMAGE_DATA;
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': image.length
    });
    res.end(image);
  } catch (err) {
    console.error('Image retrieval error:', err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.close();
  }
});

// Handle fanart submission with file upload
app.post('/fanart', upload.single('fanartImage'), async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  const { imageName, bookId, characterName } = req.body;
  const imageFile = req.file;

  if (!imageName || !imageFile) {
    return res.status(400).send("Image name and file are required");
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Get next fanart ID
    const nextIdResult = await connection.execute(
      `SELECT fanart_seq.NEXTVAL FROM dual`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const nextId = nextIdResult.rows[0].NEXTVAL;

    // Insert new fanart with BLOB data
    await connection.execute(
      `INSERT INTO fanart (fanart_id, user_id, image_name, image_data, book_id, character_name)
       VALUES (:fanartId, :userId, :imageName, :imageData, :bookId, :characterName)`,
      {
        fanartId: nextId,
        userId,
        imageName: imageName.trim(),
        imageData: imageFile.buffer,
        bookId: bookId || null,
        characterName: characterName || null
      },
      { autoCommit: true }
    );

    res.redirect('/fanart');
  } catch (err) {
    console.error('Fanart submission error:', err);
    res.status(500).send("Error submitting fanart");
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/fanart/search', async (req, res) => {
  const { bookId, character } = req.body;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    let query = `SELECT f.fanart_id, f.image_name, f.character_name, f.upload_date,
                        b.book_id, b.title as book_title, b.image as book_image,
                        u.user_id, u.name as user_name
                 FROM fanart f
                 LEFT JOIN books b ON f.book_id = b.book_id
                 JOIN users u ON f.user_id = u.user_id
                 WHERE 1=1`;
    
    const binds = {};
    
    if (bookId) {
      query += ` AND f.book_id = :bookId`;
      binds.bookId = bookId;
    }
    
    if (character) {
      query += ` AND LOWER(f.character_name) LIKE LOWER(:character)`;
      binds.character = `%${character}%`;
    }
    
    query += ` ORDER BY f.upload_date DESC`;

    const fanartResult = await connection.execute(
      query,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Get all books for the search dropdown
    const booksResult = await connection.execute(
      `SELECT book_id, title FROM books ORDER BY title`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Get all unique characters for the search dropdown
    const charactersResult = await connection.execute(
      `SELECT DISTINCT character_name FROM fanart WHERE character_name IS NOT NULL ORDER BY character_name`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.render('fanart', {
      fanarts: fanartResult.rows,
      books: booksResult.rows,
      characters: charactersResult.rows.map(c => c.CHARACTER_NAME),
      userId: req.session.userId,
      searchParams: { bookId, character }
    });
  } catch (err) {
    console.error('Fanart search error:', err);
    res.status(500).send("Internal Server Error");
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
