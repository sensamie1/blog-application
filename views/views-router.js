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

// /views (welcome page)
router.get('/', (req, res) => {
    res.render('welcome', { user: res.locals.user, });
})

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
            req.flash('error', 'There are no published blogs at this time.')
            res.render('blogs', {
                user: res.locals.user,
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
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
            req.flash('error', `Your search - "${query}"  - did not match any published document.`);
            res.render('blogs', {
                user: res.locals.user,
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
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

// /views/blogs/:id (non user view blog by id)
router.get('/blogs/:id', async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await BlogModel.findById(blogId);

        if (!blog) {
            return res.render('404');
        }

        // Increment the read_count by 1
        blog.read_count = blog.read_count + 1;
        

        // Reading_time based on the word count
        const wordsPerMinute = 250;
        const wordCount = blog.body.split(' ').length;
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        const readingTime = `${minutes} min(s)`;

        blog.reading_time = readingTime
        await blog.save();

        res.render('view-blog', {
            user: res.locals.user,
            blog: blog,
            reading_time: readingTime
        });
    } catch (error) {

        console.error(error);
        res.render('error');
    }
});

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
    } else if (response.code === 409) {
        req.flash('error', 'User already exists. Login or signup with different details.');
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

// /views/auth-blogs (user gets all blogs)
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
                req.flash('error', 'There are no published blogs at this time.')
                res.render('auth-blogs', {
                    user: res.locals.user,
                    blogs: blogs,
                    current: page,
                    pages: Math.ceil(totalCount / perPage)
                });
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

// /views/auth-blogs/:id (user view blog by id)
router.get('/auth-blogs/:id', async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await BlogModel.findById(blogId);

        if (!blog) {
            return res.render('404');
        }

        // Increment the read_count by 1
        blog.read_count = blog.read_count + 1;

        // Reading_time based on the word count
        const wordsPerMinute = 250;
        const wordCount = blog.body.split(' ').length;
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        const readingTime = `${minutes} min(s)`;

        blog.reading_time = readingTime
        await blog.save();

        res.render('view-blog', {
            user: res.locals.user,
            blog: blog,
            reading_time: readingTime
        });
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
    const paragraphs = req.body.body.split(/\r?\n/);
    const formattedBody = paragraphs.map(paragraph => `<p>${paragraph}</p>`).join("");
    const response = await blogService.createBlog({
        title: req.body.title,
        description: req.body.description,
        state: "draft",
        author_id: res.locals.user._id,
        tags: req.body.tags,
        body: formattedBody
    });

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

// /views/auth-search (users search for blogs)
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
            req.flash('error', `Your search - "${query}"  - did not match any published document.`);
            res.render('auth-blogs', {
                user: res.locals.user,
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
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

// /views/auth-blogspublished (users get published blogs)
router.get('/auth-blogspublished', async (req, res) => {
    const perPage = 20;
    const page = req.query.page || 1;
    try {
        const totalCount = await BlogModel.countDocuments({ author_id: res.locals.user._id, state: { $in: ['published'] } });
        const blogs = await BlogModel.find({ author_id: res.locals.user._id, state: { $in: ['published'] } })
            .sort({ updatedAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage);

        if (blogs.length === 0) {
            req.flash('error', `You are yet to publish any blog.`);
            res.render('auth-blogspublished', {
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
        } else {
            res.render('auth-blogspublished', {
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

// /views/auth-blogsdraft (users get draft blogs)
router.get('/auth-blogsdraft', async (req, res) => {
    const perPage = 20;
    const page = req.query.page || 1;
    try {
        const totalCount = await BlogModel.countDocuments({ author_id: res.locals.user._id, state: { $in: ['draft'] } });
        const blogs = await BlogModel.find({ author_id: res.locals.user._id, state: { $in: ['draft'] } })
            .sort({ updatedAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage);

        if (blogs.length === 0) {
            req.flash('error', `You have no blogs in draft.`);
            res.render('auth-blogsdraft', {
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
        } else {
            res.render('auth-blogsdraft', {
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

// /views/auth-blogsdeleted (users get temporarily deleted blogs)
router.get('/auth-blogsdeleted', async (req, res) => {
    const perPage = 20;
    const page = req.query.page || 1;
    try {
        const totalCount = await BlogModel.countDocuments({ author_id: res.locals.user._id, state: { $in: ['deleted'] } });
        const blogs = await BlogModel.find({ author_id: res.locals.user._id, state: { $in: ['deleted'] } })
            .sort({ updatedAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage);

        if (blogs.length === 0) {
            req.flash('error', `You have no deleted blog.`);
            res.render('auth-blogsdeleted', {
                blogs: blogs,
                current: page,
                pages: Math.ceil(totalCount / perPage)
            });
        } else {
            res.render('auth-blogsdeleted', {
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

// /views/blogs/update/:id (user update blog state by id)
router.post('/blogs/update/:id', userService.isAuthenticatedForUpdate, blogService.updateBlogState)

// /views/blogs/edit/:id (user edit blog by id)
router.post('/blogs1/edit/:id', userService.isAuthenticatedForUpdate, blogService.editBlog)

// /views/blogs/delete/:id (user update blog to deleted by id)
router.post('/blogs/delete/:id', userService.isAuthenticatedForUpdate, blogService.deleteState)

// /views/blogs/:id (user permanently deleted blog by id)
router.post('/blogs/:id', userService.isAuthenticatedForUpdate, blogService.deleteBlog)

// /views/blogs/edit/:id (get blog for editing)
router.get('/blogs/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.redirect('/blognotcreated');
        }

        const blogs = await BlogModel.findById(id);
        if (!blogs) {
            res.redirect('/blognotcreated');
        } else {
            res.render('editblog', { 
                blogs: blogs,
            });
        }
    } catch (error) {
        console.error(error);
        res.redirect('/blognotcreated');
    }
});


// /views/blogupdatesuccess (blog update success)
router.get('/blogupdatesuccess', async (req, res) => {
    res.render('blogupdatesuccess')
})

// /views/blogdeletesuccess (blog delete success)
router.get('/blogdeletesuccess', async (req, res) => {
    res.render('blogdeletesuccess')
})

// error page
router.get('*', (req, res) => {
    res.render('404', { user: res.locals.user || null });
})

module.exports = router;
