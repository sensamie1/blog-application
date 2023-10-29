const express = require('express');
const userService = require('../users/users-services');
const blogService = require('../blogs/blogs-services');
const userMiddleware = require('../users/users-middleware');
const BlogModel = require('../models/blog-model');

const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const router = express.Router();

router.use(cookieParser())

router.use(express.static('./views'));

// /views/welcome (welcome page)
router.get('/welcome', (req, res) => {
    res.render('welcome', { user: res.locals.user, });
})

// /views/blogs (get all blogs)
router.get('/blogs', async (req, res) => {
    const perPage = 20;
    const page = req.query.page || 1;
    try {
        const totalCount = await BlogModel.countDocuments({ state: 'published' });
        const blogs = await BlogModel.find({ state: 'published' })
            .sort({ updatedAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage);

        if (blogs.length === 0) {
            req.flash('There are no published blogs at this time.')
            res.render('blogs');
        } else {
            res.render('blogs', {
                user: res.locals.user,
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
        }
    } catch (error) {
        console.error(error);
        res.render('error');
    }
});

// /views/search (non users search for blogs)
router.get('/search', async (req, res) => {
    const perPage = 20;
    const page = req.query.page || 1;
    const query = req.query.query;
    try {
        const totalCount = await BlogModel.countDocuments({
            state: 'published',
            $or: [
                { author: { $regex: query, $options: 'i' } },
                { title: { $regex: query, $options: 'i' } },
                { tags: { $regex: query, $options: 'i' } }
            ]
        });
        const blogs = await BlogModel.find({
            state: 'published',
            $or: [
                { author: { $regex: query, $options: 'i' } },
                { title: { $regex: query, $options: 'i' } },
                { tags: { $regex: query, $options: 'i' } }
            ]
        })
            .sort({ updatedAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage);

        if (blogs.length === 0) {
            req.flash(`There are no published blogs with "${query}" at this time.`);
            res.render('noblogs');
        } else {
            res.render('blogs', {
                user: res.locals.user,
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
        }
    } catch (error) {
        console.error(error);
        res.render('error');
    }
});


// /views/blogs/:id (view blog id)
router.post('/blogs/:id',  async (req, res) => {
    try{
        const blogId = req.params.id;
        const blog = await BlogModel.findOneAndUpdate(
            { _id: blogId, state: 'published' },
            { $inc: { read_count: 1 } },
            { new: true }
        );
        // Reading time based on the word count
        const wordsPerMinute = 250;
        const wordCount = blog.body.split(' ').length;
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        const readingTime = `${minutes} min(s)`;
    
        // Updating the reading_time field in the blog
        blog.reading_time = readingTime;
        await blog.save();
        if (blog.length === 0) {
            res.render('blogs');
        } else {
            res.render('view-blog', {
                user: res.locals.user,
                blog: blog,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
        }
    } catch (error) {
        console.error(error);
        res.render('error');
}
});

// /views/view-blog (view blog page)
router.get('/view-blog', (req, res) => {
    res.render('view-blog', { user: res.locals.user, });
})


// /views/signup (signup page)
router.get('/signup', (req, res) => {
    res.render('signup', { user: res.locals.user || null,  messages: req.flash() });
})

// /views/signup (signup post request)
router.post('/signup', userMiddleware.ValidateUserCreation, async (req, res) => {
    const response = await userService.CreateUser(req.body);
    if (response.code === 200) {
        req.flash('success', 'Signup successful. You can now login.');
        res.redirect('signup');
    } else {
        req.flash('error', response.message);
        res.redirect('404');
    }
});

// /views/login (login page)
router.get('/login', (req, res) => {
    res.render('login', { user: res.locals.user || null, messages: req.flash() });
})

// /views/login (login post request)
router.post('/login', userMiddleware.LoginValidation, async (req, res) => {
    const response = await userService.Login({ email: req.body.email, password: req.body.password })
    if (response.code === 200) {
        // set cookie
        res.cookie('jwt', response.data.token, {maxAge: 1 * 24 * 60 * 60 * 1000})
        res.redirect('home')
    } else if (response.code === 404) {
        req.flash('error', 'Sorry, the user details provided are invalid. Please check the details and try again.');
        res.redirect('login')
    }else if (response.code === 422) {
        req.flash('error', 'Sorry, the email or password provided is incorrect. Please check your login details and try again.');
        res.redirect('login')
    }else {
        res.render('404', { error: response.message })
    }
});

// PROTECTED ROUTE
router.use(async (req, res, next) => {

    const token = req.cookies.jwt;

    if (token) {
        try {
            const decodedValue = await jwt.verify(token, process.env.JWT_SECRET);

            res.locals.user = decodedValue
            next()
        } catch (error) {
            res.redirect('welcome')
        }
    } else {
        res.redirect('welcome')
    }
})

// /views/logout
router.get('/logout', (req, res) => {    
    res.clearCookie('jwt')
    res.redirect('login')
});

// /views/home (user logged in)
router.get('/home', (req, res) => {
    console.log({ user: res.locals.user })
    res.render('home', { user: res.locals.user });
})

// /views/blogs (get all blogs)
router.get('/auth-blogs', async (req, res) => {
    const perPage = 20;
    const page = req.query.page || 1;
    try {
        const totalCount = await BlogModel.countDocuments({ state: 'published' });
        const blogs = await BlogModel.find({ state: 'published' })
            .sort({ updatedAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage);

        if (blogs.length === 0) {
            req.flash('There are no published blogs at this time.')
            res.render('blogs');
        } else {
            res.render('blogs', {
                user: res.locals.user,
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
        }
    } catch (error) {
        console.error(error);
        res.render('error');
    }
});

// /views/blogcreate (get create blog page)
router.get('/blogcreate', (req, res) => {
    res.render('blogcreate', { user: res.locals.user || null, messages: req.flash() });
})

// /views/blogcreate (user create blog)
router.post('/blogcreate', async (req, res) => {
    const response = await blogService.createBlog({
        title: req.body.title,
        description: req.body.description,
        state: "draft",
        author_id: res.locals.user._id,
        tags: req.body.tags,
        body: req.body.body
    });

    console.log({ body: req.body });
    console.log(response);

    if (response.code === 201) {
        req.flash('success', 'Blog created! Check my blogs.');
        res.redirect('blogcreate'); 
    }else if (response.code === 409) {
        req.flash('error', 'Blog already created.')
        res.redirect('blogcreate')
    } else {
        req.flash('error', 'Error creating blog! Try again.');
        res.render('blogcreate', { error: response.message });
    }
});


// /views/search (users search for blogs)
router.get('/auth-search', async (req, res) => {
    const perPage = 20;
    const page = req.query.page || 1;
    const query = req.query.query;
    try {
        const totalCount = await BlogModel.countDocuments({
            state: 'published',
            $or: [
                { author: { $regex: query, $options: 'i' } },
                { title: { $regex: query, $options: 'i' } },
                { tags: { $regex: query, $options: 'i' } }
            ]
        });
        const blogs = await BlogModel.find({
            state: 'published',
            $or: [
                { author: { $regex: query, $options: 'i' } },
                { title: { $regex: query, $options: 'i' } },
                { tags: { $regex: query, $options: 'i' } }
            ]
        })
            .sort({ updatedAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage);

        if (blogs.length === 0) {
            req.flash(`There are no published blogs with "${query}" at this time.`);
            res.render('auth-noblogs');
        } else {
            res.render('auth-blogs', {
                user: res.locals.user,
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
        }
    } catch (error) {
        console.error(error);
        res.render('error');
    }
});

// error page
router.get('*', (req, res) => {
    res.render('404', { user: res.locals.user || null });
})

module.exports = router;
