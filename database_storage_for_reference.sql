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
INSERT INTO users VALUES (4, 'Diana', 'diana@example.com', 'pass321', 70, 1);
INSERT INTO users VALUES (5, 'Evan', 'evan@example.com', 'pass654', 65, 3);
INSERT INTO users VALUES (6, 'Manasvi', 'iit2023006@iiita.ac.in', 'mansu', 100000, 3);
-- BOOKS INSERT with descriptions
INSERT INTO books VALUES (1, '1984', 'George Orwell', 'Dystopian', 'https://covers.openlibrary.org/b/id/7222246-L.jpg', 
'In a totalitarian society where the Party controls all aspects of life, Winston Smith begins a forbidden love affair and dares to think rebellious thoughts.', 4.5);

INSERT INTO books VALUES (2, 'To Kill a Mockingbird', 'Harper Lee', 'Classic', 'https://covers.openlibrary.org/b/id/8225265-L.jpg', 
'Set in the American South during the 1930s, this novel follows young Scout Finch as her father, a lawyer, defends a black man wrongly accused of a crime.', 5.0);

INSERT INTO books VALUES (3, 'The Great Gatsby', 'F. Scott Fitzgerald', 'Classic', 'https://covers.openlibrary.org/b/id/7352167-L.jpg', 
'A portrait of the Jazz Age in all of its decadence and excess, through the story of the fabulously wealthy Jay Gatsby and his love for Daisy Buchanan.', 4.2);

INSERT INTO books VALUES (4, 'The Hobbit', 'J.R.R. Tolkien', 'Fantasy', 'https://covers.openlibrary.org/b/id/6979861-L.jpg', 
'Bilbo Baggins, a hobbit, is swept into an epic quest to reclaim the lost Dwarf Kingdom of Erebor from the fearsome dragon Smaug.', 4.8);

INSERT INTO books VALUES (5, 'Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', 'Fantasy', 'https://covers.openlibrary.org/b/id/7984916-L.jpg', 
'The first book in the Harry Potter series follows young wizard Harry as he begins his education at Hogwarts School of Witchcraft and Wizardry.', 5.0);

INSERT INTO books VALUES (6, 'Sapiens', 'Yuval Noah Harari', 'Non-Fiction', 'https://covers.openlibrary.org/b/id/9111981-L.jpg', 
'A brief history of humankind, exploring the ways in which biology and history have defined us and enhanced our understanding of what it means to be human.', 4.7);

INSERT INTO books VALUES (7, 'Atomic Habits', 'James Clear', 'Self-help', 'https://covers.openlibrary.org/b/id/10599978-L.jpg', 
'A guide to building good habits and breaking bad ones, with a framework based on scientific research and real-world examples.', 4.9);

INSERT INTO books VALUES (8, 'The Alchemist', 'Paulo Coelho', 'Fiction', 'https://covers.openlibrary.org/b/id/10200561-L.jpg', 
'A shepherd boy named Santiago travels from Spain to Egypt in search of treasure, learning about life and his own personal legend along the way.', 4.3);

INSERT INTO books VALUES (9, 'Pride and Prejudice', 'Jane Austen', 'Romance', 'https://covers.openlibrary.org/b/id/8091016-L.jpg', 
'The romantic clash between the opinionated Elizabeth Bennet and the proud Mr. Darcy in 19th century England.', 4.6);

INSERT INTO books VALUES (10, 'The Catcher in the Rye', 'J.D. Salinger', 'Classic', 'https://covers.openlibrary.org/b/id/8231856-L.jpg', 
'Holden Caulfield, a teenager from New York City, wanders around the city after being expelled from prep school, reflecting on his life and society.', 3.9);

INSERT INTO books VALUES (11, 'Dune', 'Frank Herbert', 'Sci-Fi', 'https://covers.openlibrary.org/b/id/8108694-L.jpg', 
'On the desert planet Arrakis, young Paul Atreides becomes a messiah to the native Fremen people and leads a rebellion against the galactic empire.', 4.4);

INSERT INTO books VALUES (12, 'The Book Thief', 'Markus Zusak', 'Historical', 'https://covers.openlibrary.org/b/id/8228691-L.jpg', 
'Narrated by Death, this novel follows Liesel Meminger, a young girl in Nazi Germany who steals books and shares them with others.', 4.6);

INSERT INTO books VALUES (13, 'The Road', 'Cormac McCarthy', 'Post-apocalyptic', 'https://covers.openlibrary.org/b/id/8676098-L.jpg', 
'A father and his young son journey across a post-apocalyptic America, struggling to survive in a devastated landscape.', 4.1);

INSERT INTO books VALUES (14, 'Brave New World', 'Aldous Huxley', 'Dystopian', 'https://covers.openlibrary.org/b/id/8771806-L.jpg', 
'A futuristic society where people are genetically engineered and conditioned for their roles in a rigid caste system, raising questions about freedom and happiness.', 4.2);

INSERT INTO books VALUES (15, 'The Fault in Our Stars', 'John Green', 'Romance', 'https://covers.openlibrary.org/b/id/7852161-L.jpg', 
'Two teenagers with cancer meet and fall in love at a support group, embarking on a journey to Amsterdam to meet a reclusive author.', 4.5);

INSERT INTO books VALUES (16, 'The Silent Patient', 'Alex Michaelides', 'Thriller', 'https://covers.openlibrary.org/b/id/10533792-L.jpg', 
'A criminal psychotherapist becomes obsessed with uncovering the truth behind a woman''s act of violence against her husband and her subsequent silence.', 4.6);

INSERT INTO books VALUES (17, 'Educated', 'Tara Westover', 'Memoir', 'https://covers.openlibrary.org/b/id/9259597-L.jpg', 
'A woman''s journey from growing up in a survivalist family in Idaho to earning a PhD from Cambridge University, despite never having attended school.', 4.7);

INSERT INTO books VALUES (18, 'Becoming', 'Michelle Obama', 'Memoir', 'https://covers.openlibrary.org/b/id/9253186-L.jpg', 
'The former First Lady of the United States shares her journey from the South Side of Chicago to the White House, offering insights into her life and values.', 4.8);

INSERT INTO books VALUES (19, 'The Shining', 'Stephen King', 'Horror', 'https://covers.openlibrary.org/b/id/8231851-L.jpg', 
'A writer takes a job as the winter caretaker of an isolated hotel, where supernatural forces and his own demons threaten his sanity and his family''s safety.', 4.3);

INSERT INTO books VALUES (20, 'Gone Girl', 'Gillian Flynn', 'Thriller', 'https://covers.openlibrary.org/b/id/8224815-L.jpg', 
'When his wife disappears on their fifth wedding anniversary, Nick Dunne becomes the prime suspect in her presumed murder, but nothing is as it seems.', 4.5);

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

COMMIT;