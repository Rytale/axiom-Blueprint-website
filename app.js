/* ========================================
   Axiom Blueprint Marketplace v0.1.2
   ----------------------------------------
   A site that allows for uploading of Axiom blueprints,
   this site is for demo purposes and is not a full release.
   I do plan on expanding further and adding extra features.


   ======================================== */
                
/* 
  TODO: Clean up file structure
  TODO: Optimize code and remove any unessary code created during beta testing
  TODO: Add search feature to the blueprints
  TODO: Pull Tags from the blueprints for easy searching
*/ 



/*
  FIXME: ADMIN controls need to be fixed and emplemented correctly instead of how i handled it previously
  FIXME: Css is garbage 

*/


//

// ========= Personal Notes =========
/*
   - Remember to optimize this later
   - Consider refactoring this block into smaller functions
*/


// ========= Project Ideas =========
/*
   Project ideas or potential improvements:
   - Profile editor
   - Your uploads tab
   - favorites system so you can save files without downloading them
   - download counter for each package
   - ratings?
   - I NEED ANOTHER DEV
*/

/* ==========================
          Packages <3
   ========================== */
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { readAndGenerateThumbnail } = require('./utils/readAndGen');
require('dotenv').config();

const app = express();

// Constants temp
const UPLOAD_FOLDER = 'uploads';

/* ==========================
   Middleware Configuration
   ========================== */

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');

/* ====================
   Database Connection
   ==================== */
   MONGODB = process.env.MONGO
mongoose.connect(MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

/* ========================
   Model Definitions
   ======================== */

const User = mongoose.model('User', {
    username: String,
    password: String,
    icon: String,
    isAdmin: { type: Boolean, default: false },
});

const Blueprint = mongoose.model('Blueprint', {
    uploader: String,
    filename: String,
});

/* ========================
   Authentication Strategies
   ======================== */

passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        const user = await User.findOne({ username });
        if (!user) return done(null, false, { message: 'Incorrect username.' });

        const result = await bcrypt.compare(password, user.password);
        if (result) {
            return done(null, user);
        } else {
            return done(null, false, { message: 'Incorrect password.' });
        }
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

/* =====================
   Multer Configuration
   ===================== */

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_FOLDER);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

/* ======================
   Route Handlers
   ====================== */

// Delete a blueprint
app.get('/delete/:filename', isAdmin, deleteBlueprint);

// Rename a blueprint
app.get('/rename/:filename', isAdmin, renameBlueprint);

// Upload a blueprint
app.post('/upload', isAuthenticated, upload.single('blueprint'), uploadBlueprint);

// Download a blueprint
app.get('/download/:filename', isAuthenticated, downloadBlueprint);

// Delete a blueprint (POST method)
app.post('/delete/:filename', isAdmin, deleteBlueprintPost);

// Rename a blueprint (POST method)
app.post('/rename/:filename', isAdmin, renameBlueprintPost);

// Display blueprints
app.get('/', displayBlueprints);

// Show login page
app.get('/login', showLogin);

// Authenticate login
app.post('/login', authenticateLogin);

// Show register page
app.get('/register', showRegister);

// Register a new user
app.post('/register', registerUser);

// Logout user
app.get('/logout', logoutUser);

/* ====================
   Server Setup
   ==================== */
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

/* =======================
   Middleware Functions
   ======================= */
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}
// Check if the user is an admin
function isAdmin(req, res, next) {
    if (req.user && req.user.isAdmin) {
        return next();
    } else {
        res.redirect('/');
    }
}

/* =============================
   Route Handling Functions
   ============================= */

async function deleteBlueprint(req, res) {
    const filename = req.params.filename;
    try {
        const blueprint = await Blueprint.findOne({ filename });
        if (!blueprint) {
            return res.redirect('/');
        }

        const filePath = path.join(__dirname, UPLOAD_FOLDER, blueprint.filename);
        fs.unlinkSync(filePath);

        await Blueprint.findOneAndDelete({ filename });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
}

async function renameBlueprint(req, res) {
    const oldFilename = req.params.filename;
    const newFilename = req.body.newFilename;
    try {
        await Blueprint.findOneAndUpdate({ filename: oldFilename }, { filename: newFilename });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
}

async function uploadBlueprint(req, res) {
    if (!req.file) {
        return res.redirect('/?error=noFile');
    }

    const uploaderUsername = req.user.username;
    const uploadedFileName = req.file.filename;

    try {
        const existingBlueprint = await Blueprint.findOne({ filename: uploadedFileName });

        if (existingBlueprint) {
            return res.redirect('/?error=duplicateFile');
        }

        const blueprint = new Blueprint({
            uploader: uploaderUsername,
            filename: uploadedFileName,
        });
        await blueprint.save();

        // Generate thumbnail file path
        const thumbnailFilePath = path.join(__dirname, '/public/thumbnails', uploadedFileName.replace('.bp', '.png'));

        // Generate the thumbnail using the function
        await readAndGenerateThumbnail(req.file.path, thumbnailFilePath);

        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/?error=uploadError');
    }
}

function downloadBlueprint(req, res) {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, UPLOAD_FOLDER, filename);
    res.download(filePath);
}

async function deleteBlueprintPost(req, res) {
    const filename = req.params.filename;
    try {
        await Blueprint.findOneAndDelete({ filename });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
}

async function renameBlueprintPost(req, res) {
    const oldFilename = req.params.filename;
    const newFilename = req.body.newFilename;
    try {
        await Blueprint.findOneAndUpdate({ filename: oldFilename }, { filename: newFilename });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
}

async function displayBlueprints(req, res) {
    const blueprintsPerPage = 6; // Number of blueprints per page
    const currentPage = req.query.page ? parseInt(req.query.page) : 1;
    const startIndex = (currentPage - 1) * blueprintsPerPage;
    const endIndex = startIndex + blueprintsPerPage;

    try {
        const blueprintDocs = await Blueprint.find();
        const blueprints = blueprintDocs.map(doc => doc.filename);
        const usernamesMap = {}; // Object to store the mapping of filenames to uploader usernames

        blueprintDocs.forEach(doc => {
            usernamesMap[doc.filename] = doc.uploader;
        });

        res.render('index.ejs', { user: req.user, blueprints, usernamesMap, req, currentPage });
    } catch (err) {
        console.error(err);
        res.render('index.ejs', { user: req.user, blueprints: [], usernamesMap: {}, req, currentPage });
    }
}

function showLogin(req, res) {
    res.render('login.ejs');
}

function authenticateLogin(req, res, next) {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        if (!user) {
            return res.redirect('/login');
        }
        req.login(user, (err) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            return res.redirect('/');
        });
    })(req, res, next);
}

function showRegister(req, res) {
    res.render('register.ejs');
}

async function registerUser(req, res) {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
        username,
        password: hashedPassword,
        icon: 'EGGDOG.png',
    });

    try {
        await user.save();
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.redirect('/register');
    }
}

function logoutUser(req, res) {
    req.logout(() => {
        res.redirect('/');
    });
}



