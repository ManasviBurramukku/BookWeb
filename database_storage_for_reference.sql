-- DROP TABLES (using anonymous PL/SQL block for safe execution)
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE reviews CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -942 THEN
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE books CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -942 THEN
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE users CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -942 THEN
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE merchandise CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -942 THEN
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE redemptions CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -942 THEN
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE saved_books CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -942 THEN
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE community_comments CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE community_channels CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE fanart CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE channel_seq';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -2289 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE comment_seq';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -2289 THEN RAISE; END IF;
END;
/

-- USERS TABLE
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    name VARCHAR2(100),
    email VARCHAR2(100) UNIQUE,
    pass VARCHAR2(100),
    total_points INT DEFAULT 0,
    last_reviewed_book_id INT
);

-- BOOKS TABLE (updated with description column)
CREATE TABLE books (
    book_id INT PRIMARY KEY,
    title VARCHAR2(200),
    author VARCHAR2(100),
    genre VARCHAR2(50),
    image VARCHAR2(255),
    description VARCHAR2(200),
    rating FLOAT DEFAULT 0
);

-- REVIEWS TABLE (updated with likes/dislikes columns)
CREATE TABLE reviews (
    review_id INT PRIMARY KEY,
    book_id INT,
    user_id INT,
    rating FLOAT,
    review CLOB,
    likes INT DEFAULT 0,
    dislikes INT DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(book_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- USERS INSERT
INSERT INTO users VALUES (1, 'Alice', 'alice@example.com', 'pass123', 120, 2);
INSERT INTO users VALUES (2, 'Bob', 'bob@example.com', 'pass456', 85, 4);
INSERT INTO users VALUES (3, 'Charlie', 'charlie@example.com', 'pass789', 90, 5);
INSERT INTO users VALUES (4, 'princess ananya', 'diana@example.com', 'pass321', 700000000, 3);
INSERT INTO users VALUES (5, 'Evan', 'evan@example.com', 'pass654', 65, 3);
INSERT INTO users VALUES (6, 'Manasvi', 'iit2023006@iiita.ac.in', 'mansu', 100000, 3);

-- BOOKS INSERT with descriptions
INSERT INTO books VALUES (1, '1984', 'George Orwell', 'Dystopian', 'https://covers.openlibrary.org/b/id/7222246-L.jpg', 
'In a totalitarian society where the Party controls all aspects of life, Winston Smith begins a forbidden love affair and dares to think rebellious thoughts.', 4.5);


INSERT INTO books VALUES (2, 'To Kill a Mockingbird', 'Harper Lee', 'Classic', 'https://vaundamicheauxnelson.com/wp-content/uploads/2021/12/Mockingbird-Cover-216x300.jpg', 
'Set in the American South during the 1930s, this novel follows young Scout Finch as her father, a lawyer, defends a black man wrongly accused of a crime.', 5.0);

INSERT INTO books VALUES (3, 'The Great Gatsby', 'F. Scott Fitzgerald', 'Classic', 'https://i.pinimg.com/736x/9f/6f/81/9f6f81ec648dcbdf6691f2f590bd2b5b.jpg', 
'A portrait of the Jazz Age in all of its decadence and excess, through the story of the fabulously wealthy Jay Gatsby and his love for Daisy Buchanan.', 4.2);

INSERT INTO books VALUES (4, 'The Hobbit', 'J.R.R. Tolkien', 'Fantasy', 'https://i.pinimg.com/736x/27/cf/91/27cf91f605923223613909c7b9d2219f.jpg', 
'Bilbo Baggins, a hobbit, is swept into an epic quest to reclaim the lost Dwarf Kingdom of Erebor from the fearsome dragon Smaug.', 4.8);

INSERT INTO books VALUES (5, 'Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', 'Fantasy', 'https://i.pinimg.com/736x/f1/75/21/f175218f1ba1e55d2440955c4b5a5d75.jpg', 
'The first book in the Harry Potter series follows young wizard Harry as he begins his education at Hogwarts School of Witchcraft and Wizardry.', 5.0);

INSERT INTO books VALUES (6, 'Sapiens', 'Yuval Noah Harari', 'Non-Fiction', 'https://i.pinimg.com/736x/43/64/17/4364176205e92dde419e0f2d47eee0f1.jpg', 
'A brief history of humankind, exploring the ways in which biology and history have defined us and enhanced our understanding of what it means to be human.', 4.7);

INSERT INTO books VALUES (7, 'Atomic Habits', 'James Clear', 'Self-help', 'https://m.media-amazon.com/images/I/41wuB-s8vRL._SL500_.jpg', 
'A guide to building good habits and breaking bad ones, with a framework based on scientific research and real-world examples.', 4.9);

INSERT INTO books VALUES (8, 'The Alchemist', 'Paulo Coelho', 'Fiction', 'https://www.bookishadda.com/cdn/shop/files/79_ba6c2a23-4a09-46af-8e85-c4cd086235f5.png?v=1701858748&width=823', 
'A shepherd boy named Santiago travels from Spain to Egypt in search of treasure, learning about life and his own personal legend along the way.', 4.3);

INSERT INTO books VALUES (9, 'Pride and Prejudice', 'Jane Austen', 'Romance', 'https://i.pinimg.com/736x/82/77/ab/8277ab1138d98021f0214c1fbf8cc387.jpg', 
'The romantic clash between the opinionated Elizabeth Bennet and the proud Mr. Darcy in 19th century England.', 4.6);

INSERT INTO books VALUES (10, 'The Catcher in the Rye', 'J.D. Salinger', 'Classic', 'https://i.pinimg.com/736x/4b/be/9c/4bbe9c695bd2c2005847108120df0612.jpg', 
'Holden Caulfield, a teenager from New York City, wanders around the city after being expelled from prep school, reflecting on his life and society.', 3.9);

INSERT INTO books VALUES (11, 'Dune', 'Frank Herbert', 'Sci-Fi', 'https://i.pinimg.com/736x/1b/83/b7/1b83b7fd9aba1bc0a5087968dbe4ce70.jpgg', 
'On the desert planet Arrakis, young Paul Atreides becomes a messiah to the native Fremen people and leads a rebellion against the galactic empire.', 4.4);

INSERT INTO books VALUES (12, 'The Book Thief', 'Markus Zusak', 'Historical', 'https://i.pinimg.com/736x/8d/fc/99/8dfc999cca18dc8875ef7df76358f6ee.jpg', 
'Narrated by Death, this novel follows Liesel Meminger, a young girl in Nazi Germany who steals books and shares them with others.', 4.6);

INSERT INTO books VALUES (13, 'The Road', 'Cormac McCarthy', 'Post-apocalyptic', 'https://i.pinimg.com/736x/53/79/07/537907471154dbd706110fc02e287e78.jpg', 
'A father and his young son journey across a post-apocalyptic America, struggling to survive in a devastated landscape.', 4.1);

INSERT INTO books VALUES (14, 'Brave New World', 'Aldous Huxley', 'Dystopian', 'https://i.pinimg.com/736x/4d/e4/46/4de4461b2faf2356cfc3954c978f9485.jpg', 
'A futuristic society where people are genetically engineered and conditioned for their roles in a rigid caste system, raising questions about freedom and happiness.', 4.2);

INSERT INTO books VALUES (15, 'The Fault in Our Stars', 'John Green', 'Romance', 'https://i.pinimg.com/736x/97/6c/3b/976c3b589a6d00a0c2b86714fc33b337.jpg', 
'Two teenagers with cancer meet and fall in love at a support group, embarking on a journey to Amsterdam to meet a reclusive author.', 4.5);

INSERT INTO books VALUES (16, 'The Silent Patient', 'Alex Michaelides', 'Thriller', 'https://i.pinimg.com/736x/ee/c3/7c/eec37c45c2b005f960546946d242308a.jpg', 
'A criminal psychotherapist becomes obsessed with uncovering the truth behind a woman''s act of violence against her husband and her subsequent silence.', 4.6);

INSERT INTO books VALUES (17, 'Educated', 'Tara Westover', 'Memoir', 'https://i.pinimg.com/736x/00/0c/4a/000c4ad73f0f7930c1240dba7f2f50d0.jpg', 
'A woman''s journey from growing up in a survivalist family in Idaho to earning a PhD from Cambridge University, despite never having attended school.', 4.7);

INSERT INTO books VALUES (18, 'Becoming', 'Michelle Obama', 'Memoir', 'https://i.pinimg.com/736x/73/52/b6/7352b62120c8b68da1910f0372aedb56.jpg', 
'The former First Lady of the United States shares her journey from the South Side of Chicago to the White House, offering insights into her life and values.', 4.8);

INSERT INTO books VALUES (19, 'The Shining', 'Stephen King', 'Horror', 'https://i.pinimg.com/736x/f3/57/ab/f357abf66dc173d8397e81fba880c72e.jpg', 

'A writer takes a job as the winter caretaker of an isolated hotel, where supernatural forces and his own demons threaten his sanity and his family''s safety.', 4.3);

INSERT INTO books VALUES (20, 'Gone Girl', 'Gillian Flynn', 'Thriller', 'https://i.pinimg.com/736x/6c/30/ca/6c30ca68df18aa8b9ed0b3f77e12b5ab.jpg', 
'When his wife disappears on their fifth wedding anniversary, Nick Dunne becomes the prime suspect in her presumed murder, but nothing is as it seems.', 4.5);

INSERT INTO books VALUES (21, 'A Man Called Ove', 'Fredrik Backman', 'Fiction', 'https://i.pinimg.com/736x/49/e8/6d/49e86dfdfc5aeedd02a082d70bd7ead3.jpg',
'A grumpy yet lovable old man finds his solitary world turned upside down when a lively family moves in next door.', 4.6);

INSERT INTO books VALUES (22, 'Circe', 'Madeline Miller', 'Fantasy', 'https://i.pinimg.com/736x/0a/81/62/0a8162cbaa1307822dedda27f8d07a80.jpg',
'A retelling of the Greek myth through the eyes of the sorceress Circe as she battles gods, monsters, and her own fate.', 4.4);

INSERT INTO books VALUES (23, 'The Midnight Library', 'Matt Haig', 'Fiction', 'https://i.pinimg.com/736x/ea/87/e5/ea87e5dd6bd36ccea9299fc024f08c09.jpg',
'A woman discovers a library between life and death where she can explore alternate lives she could have lived.', 4.3);

INSERT INTO books VALUES (24, 'The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'Romance', 'https://i.pinimg.com/736x/0f/e7/65/0fe765939a3e31481df3d7cb26a0e699.jpg',
'An aging Hollywood icon recounts her scandalous life story to an unknown reporter, full of secrets and heartbreak.', 4.5);

INSERT INTO books VALUES (25, 'The Power of Now', 'Eckhart Tolle', 'Spirituality', 'https://i.pinimg.com/736x/f2/ff/92/f2ff92d1acec13446b566238c766ec6c.jpg',
'A guide to spiritual awakening and living in the present moment through mindfulness and inner stillness.', 4.4);

INSERT INTO books VALUES (26, 'It Ends with Us', 'Colleen Hoover', 'Romance', 'https://i.pinimg.com/736x/c0/3e/21/c03e21f2f1ff67b9fa7040b744a06a70.jpg',
'A young woman’s journey through love, abuse, and difficult choices as she breaks the cycle of violence.', 4.6);

INSERT INTO books VALUES (27, 'Project Hail Mary', 'Andy Weir', 'Sci-Fi', 'https://i.pinimg.com/736x/02/7f/04/027f0492acffc1c31af8fe0f948c4e1f.jpg',
'A lone astronaut awakens with amnesia on a desperate mission to save Earth from an extinction-level threat.', 4.7);

INSERT INTO books VALUES (28, 'The Subtle Art of Not Giving a F*ck', 'Mark Manson', 'Self-help', 'https://i.pinimg.com/736x/75/fd/60/75fd6092c16b9447c886cccc0ca183ad.jpg',
'A brutally honest guide to living a better life by caring less about the unimportant things.', 4.3);

INSERT INTO books VALUES (29, 'Little Fires Everywhere', 'Celeste Ng', 'Fiction', 'https://i.pinimg.com/736x/26/27/58/262758d1434a8fd04e97caa5ea5d531f.jpg',
'Secrets and tension ignite when a mysterious mother-daughter duo upends a quiet suburban town.', 4.4);

INSERT INTO books VALUES (30, 'Where the Crawdads Sing', 'Delia Owens', 'Mystery', 'https://i.pinimg.com/736x/70/27/ca/7027ca56ac260a52ff0a88700123d6f9.jpg',
'A murder mystery intertwined with the story of an isolated girl growing up in the marshlands of North Carolina.', 4.7);

INSERT INTO books VALUES (31, 'The Martian', 'Andy Weir', 'Sci-Fi', 'https://i.pinimg.com/736x/63/92/e5/6392e5882763c30378e4a572286eab98.jpg',
'An astronaut left behind on Mars must use science and wit to survive and return to Earth.', 4.6);

INSERT INTO books VALUES (32, 'Normal People', 'Sally Rooney', 'Romance', 'https://i.pinimg.com/736x/4b/10/82/4b1082707df87db101bcaa6ac0043871.jpg',
'A complex love story between two Irish teens who navigate life, intimacy, and identity.', 4.1);

INSERT INTO books VALUES (33, 'The 5 AM Club', 'Robin Sharma', 'Self-help', 'https://i.pinimg.com/736x/8c/cc/ea/8ccceaef56c9f50a288594003001da2a.jpg',
'Transform your life by rising early and building a productive morning routine.', 4.2);

INSERT INTO books VALUES (34, 'Verity', 'Colleen Hoover', 'Thriller', 'https://i.pinimg.com/736x/27/fb/51/27fb517947c62624f7208ce1cea4f083.jpg',
'A struggling writer uncovers disturbing secrets in the unfinished manuscript of a bestselling author.', 4.6);

INSERT INTO books VALUES (35, 'Think Like a Monk', 'Jay Shetty', 'Self-help', 'https://i.pinimg.com/736x/67/25/5d/67255d534ca328de76f1366686fb39bd.jpg',
'A guide to finding peace and purpose based on the author’s experiences as a monk.', 4.5);

INSERT INTO books VALUES (36, 'The Giver of Stars', 'Jojo Moyes', 'Historical', 'https://i.pinimg.com/736x/74/8a/67/748a67c5e0a071c6690cc55999f3e667.jpg',
'Set in Depression-era Kentucky, a group of women deliver books as part of a traveling library project.', 4.3);

INSERT INTO books VALUES (37, 'Shatter Me', 'Tahereh Mafi', 'Young Adult', 'https://i.pinimg.com/736x/b8/20/75/b82075deeb9e7ec5debb6829aa80aed9.jpg',
'A girl with a deadly touch is locked away by a repressive regime and must decide who she truly is.', 4.1);

INSERT INTO books VALUES (38, 'The Four Agreements', 'Don Miguel Ruiz', 'Philosophy', 'https://i.pinimg.com/736x/83/0f/60/830f60a31993373f57451b969c2bc607.jpg',
'A practical guide to personal freedom and happiness through ancient Toltec wisdom.', 4.4);

INSERT INTO books VALUES (39, 'The Night Circus', 'Erin Morgenstern', 'Fantasy', 'https://i.pinimg.com/736x/7b/b4/10/7bb410cead00aca531a165e596cf96b1.jpg',
'A magical competition between two young illusionists unfolds in a mysterious wandering circus.', 4.2);

INSERT INTO books VALUES (40, 'Cloud Atlas', 'David Mitchell', 'Fiction', 'https://i.pinimg.com/736x/7f/b2/00/7fb200c88de391eb789ec5d3c236f83b.jpg',
'An epic tale of interlinked lives across centuries, exploring fate, freedom, and human connection.', 4.3);
-- REVIEWS INSERT with likes/dislikes
INSERT INTO reviews VALUES (1, 1, 1, 5.0, 'A dark and chilling masterpiece.', 12, 2);
INSERT INTO reviews VALUES (2, 1, 2, 4.0, 'Great read, a bit slow in the middle.', 8, 1);
INSERT INTO reviews VALUES (3, 2, 1, 5.0, 'Heartbreaking and powerful.', 15, 0);
INSERT INTO reviews VALUES (4, 2, 3, 5.0, 'A classic everyone should read.', 20, 1);
INSERT INTO reviews VALUES (5, 3, 4, 4.0, 'Beautiful but overhyped.', 5, 3);
INSERT INTO reviews VALUES (6, 3, 5, 4.4, 'Love the style.', 7, 0);
INSERT INTO reviews VALUES (7, 4, 2, 5.0, 'My favorite fantasy ever.', 18, 2);
INSERT INTO reviews VALUES (8, 4, 3, 4.5, 'Tolkien is unmatched.', 14, 1);
INSERT INTO reviews VALUES (9, 5, 4, 5.0, 'A magical journey.', 25, 0);
INSERT INTO reviews VALUES (10, 6, 1, 4.5, 'Eye-opening book.', 10, 1);
INSERT INTO reviews VALUES (11, 6, 3, 5.0, 'Changed how I see the world.', 16, 0);
INSERT INTO reviews VALUES (12, 7, 5, 4.9, 'Very practical and motivational.', 22, 1);
INSERT INTO reviews VALUES (13, 7, 1, 5.0, 'Life-changing habits.', 30, 2);
INSERT INTO reviews VALUES (14, 8, 2, 4.0, 'Simple but deep.', 9, 3);
INSERT INTO reviews VALUES (15, 9, 3, 5.0, 'Timeless romance.', 17, 0);
INSERT INTO reviews VALUES (16, 9, 4, 4.2, 'Charming and witty.', 11, 1);
INSERT INTO reviews VALUES (17, 10, 5, 3.5, 'Didn’t resonate much.', 4, 5);
INSERT INTO reviews VALUES (18, 11, 1, 4.4, 'Epic and visionary.', 13, 1);
INSERT INTO reviews VALUES (19, 12, 2, 4.5, 'Emotional and moving.', 19, 0);
INSERT INTO reviews VALUES (20, 13, 3, 4.0, 'Bleak but powerful.', 8, 2);
INSERT INTO reviews VALUES (21, 14, 4, 4.2, 'Thought-provoking and futuristic.', 10, 1);
INSERT INTO reviews VALUES (22, 15, 5, 4.5, 'Cried so much.', 21, 3);
INSERT INTO reviews VALUES (23, 16, 1, 4.6, 'Thrilling till the end.', 15, 1);
INSERT INTO reviews VALUES (24, 17, 2, 4.7, 'Inspiring journey.', 18, 0);
INSERT INTO reviews VALUES (25, 18, 3, 4.8, 'Deeply personal and strong.', 20, 1);
INSERT INTO reviews VALUES (26, 19, 4, 4.3, 'Creepy and well-written.', 12, 2);
INSERT INTO reviews VALUES (27, 20, 5, 4.5, 'Perfect psychological thriller.', 17, 1);
INSERT INTO reviews VALUES (28, 8, 3, 4.3, 'Philosophical.', 7, 0);
INSERT INTO reviews VALUES (29, 11, 2, 4.4, 'Massive but worth it.', 11, 1);
INSERT INTO reviews VALUES (30, 10, 1, 3.8, 'Good, but not my favorite.', 5, 2);
INSERT INTO reviews VALUES (31, 21, 2, 4.8, 'Smart, funny, and surprisingly emotional.', 14, 1);
INSERT INTO reviews VALUES (32, 22, 3, 4.6, 'Gripping mystery with complex characters.', 12, 0);
INSERT INTO reviews VALUES (33, 23, 1, 4.7, 'Makes science accessible and fascinating.', 10, 2);
INSERT INTO reviews VALUES (34, 24, 4, 5.0, 'Epic storytelling and beautiful prose.', 20, 0);
INSERT INTO reviews VALUES (35, 25, 5, 4.2, 'Thoughtful and introspective.', 9, 1);
INSERT INTO reviews VALUES (36, 26, 1, 4.5, 'Intense and emotionally powerful.', 17, 1);
INSERT INTO reviews VALUES (37, 27, 2, 4.4, 'Fast-paced with lots of twists.', 13, 2);
INSERT INTO reviews VALUES (38, 28, 3, 4.9, 'Eye-opening and deeply moving.', 21, 0);
INSERT INTO reviews VALUES (39, 29, 4, 4.8, 'Brilliant and emotional sci-fi.', 16, 1);
INSERT INTO reviews VALUES (40, 30, 5, 5.0, 'A deeply moving and unforgettable story.', 25, 0);
INSERT INTO reviews VALUES (41, 31, 1, 4.5, 'Rich in history and emotion.', 11, 2);
INSERT INTO reviews VALUES (42, 32, 2, 4.0, 'Long but rewarding.', 8, 3);
INSERT INTO reviews VALUES (43, 33, 3, 4.6, 'Game-changing ideas about habits.', 19, 1);
INSERT INTO reviews VALUES (44, 34, 4, 4.7, 'Whimsical and profound.', 14, 1);
INSERT INTO reviews VALUES (45, 35, 5, 5.0, 'Devastating and beautiful.', 22, 0);
INSERT INTO reviews VALUES (46, 36, 1, 4.1, 'Great concept and fast-paced.', 9, 1);
INSERT INTO reviews VALUES (47, 37, 2, 4.3, 'Dark, cerebral, and immersive.', 13, 2);
INSERT INTO reviews VALUES (48, 38, 3, 4.4, 'Classic wisdom still relevant today.', 18, 0);
INSERT INTO reviews VALUES (49, 39, 4, 4.3, 'Honest and liberating.', 15, 1);
INSERT INTO reviews VALUES (50, 40, 5, 4.6, 'A delightful classic with heart.', 20, 0);


-- Add date_reviewed column to existing table
ALTER TABLE reviews ADD (date_reviewed TIMESTAMP DEFAULT SYSTIMESTAMP);

-- Update existing records with random dates (optional)
UPDATE reviews SET date_reviewed = SYSTIMESTAMP - NUMTODSINTERVAL(DBMS_RANDOM.VALUE(0, 30), 'DAY');

 

-- MERCHANDISE TABLE
CREATE TABLE merchandise (
    merch_id INT PRIMARY KEY,
    name VARCHAR2(100),
    image_url VARCHAR2(255),
    points_required INT
);

-- REDEMPTIONS TABLE
CREATE TABLE redemptions (
    redemption_id INT PRIMARY KEY,
    user_id INT,
    merch_id INT,
    recipient_name VARCHAR2(100),  -- Changed from 'name' to 'recipient_name'
    shipping_address VARCHAR2(500),
    redemption_date DATE DEFAULT SYSDATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (merch_id) REFERENCES merchandise(merch_id)
);

INSERT INTO merchandise VALUES (1, 'Coffee mug', 'https://i.pinimg.com/736x/f8/67/65/f8676514523b961e07a40a8daa4dd104.jpg', 500);
INSERT INTO merchandise VALUES (2, 'Tote bag', 'https://i.pinimg.com/474x/0e/d0/1c/0ed01cd8c5e10da89eeacca185d5c620.jpg', 750);
INSERT INTO merchandise VALUES (3, 'T-shirt', 'https://i.pinimg.com/736x/4d/7d/9b/4d7d9b4261b659fe16df4495049a0214.jpg', 1000);
INSERT INTO merchandise VALUES (4, 'Bookmarks', 'https://i.pinimg.com/736x/bb/1a/f5/bb1af5199276f877d677a0bac70c604c.jpg', 750);
INSERT INTO merchandise VALUES (5, 'SweatShirt', 'https://i.pinimg.com/736x/c0/fb/ef/c0fbef1ea06849af13b5969382831235.jpg', 1000);
INSERT INTO merchandise VALUES (6, 'Coffee mug', 'https://i.pinimg.com/736x/ed/10/20/ed10208d6b2f38451ea02603b36ca71f.jpg', 500);

-- Add this to your SQL script
CREATE TABLE saved_books (
    save_id INT PRIMARY KEY,
    user_id INT,
    book_id INT,
    saved_date TIMESTAMP DEFAULT SYSTIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id),
    CONSTRAINT unique_save UNIQUE (user_id, book_id)
);



-- COMMUNITY_CHANNELS TABLE
CREATE TABLE community_channels (
    channel_id INT PRIMARY KEY,
    name VARCHAR2(100) NOT NULL,
    description VARCHAR2(500),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- COMMUNITY_COMMENTS TABLE
CREATE TABLE community_comments (
    comment_id INT PRIMARY KEY,
    channel_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text VARCHAR2(2000) NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES community_channels(channel_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- SEQUENCES
CREATE SEQUENCE channel_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE comment_seq START WITH 1 INCREMENT BY 1;

-- INSERT INTO community_channels (ensure 5 values: channel_id, name, description, created_by, created_at)
INSERT INTO community_channels VALUES (channel_seq.NEXTVAL, 'General Discussion', 'Talk about anything book-related!', 1, SYSTIMESTAMP);
INSERT INTO community_channels VALUES (channel_seq.NEXTVAL, 'Recommendations', 'Share your favorite books', 2, SYSTIMESTAMP);
INSERT INTO community_channels VALUES (channel_seq.NEXTVAL, 'Book Clubs', 'Find or start a book club', 3, SYSTIMESTAMP);

-- INSERT INTO community_comments
INSERT INTO community_comments VALUES (comment_seq.NEXTVAL, 1, 1, 'Has anyone read the latest bestseller?', SYSTIMESTAMP);
INSERT INTO community_comments VALUES (comment_seq.NEXTVAL, 1, 2, 'Yes! It was amazing, highly recommend', SYSTIMESTAMP);
INSERT INTO community_comments VALUES (comment_seq.NEXTVAL, 2, 3, 'Looking for fantasy recommendations', SYSTIMESTAMP);

CREATE TABLE fanart (
    fanart_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    image_name VARCHAR2(100) NOT NULL,
    image_path VARCHAR2(255) NOT NULL,  -- Stores path to image file
    book_id INT,
    character_name VARCHAR2(100),
    upload_date TIMESTAMP DEFAULT SYSTIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id)
);
DROP SEQUENCE fanart_seq;
CREATE SEQUENCE fanart_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE fanart ADD (downloads INT DEFAULT 0);

COMMIT;
