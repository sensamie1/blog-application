const express = require('express');
const globalMiddlewares = require('../middlewares/global-middlewares');
const controller = require('./blogs-controller')

const router = express.Router();


// GET All Published Blogs (/blogs) with pagenation (/blogs?page=1&limit=20)
// Also oderable by read_count, reading_time and timestamp
// (/blogs?page=1&limit=20&sortBy=read_count&sortOrder=desc)
// (/blogs?page=1&limit=20&sortBy=reading_time&sortOrder=desc)
// (/blogs?page=1&limit=20&sortBy=timestamp)
router.get('/', controller.getAllPublishedBlogs)

// GET Published Blogs by searching key words from either: 
// 1. author
// 2. title
// 3. tags (/blogs/bysearch?query=any%20word%20or%20phrase)

// with pagenation (/blogs/search?query=any%20word%20or%20phrase&page=1&limit=20)
// Also oderable by read_count, reading_time and timestamp
// (/blogs/search?query=any%20word%20or%20phrase&page=1&limit=20&sortBy=read_count&sortOrder=desc)
// (/blogs/search?query=any%20word%20or%20phrase&page=1&limit=20&sortBy=reading_time&sortOrder=desc)
// (/blogs/search?query=any%20word%20or%20phrase&page=1&limit=20&sortBy=timestamp)
router.get('/search', controller.getBlogsBySearch)


// GET Published Blog by id (/blogs/:id)
router.get("/:id", controller.getPublishedBlogById)

// PROTECTED ROUTE
router.use(globalMiddlewares.bearerTokenAuth)

// Create Blog (/blogs)
router.post('/', globalMiddlewares.checkBody, globalMiddlewares.authenticateToken, controller.createBlog)

// GET Owner draft or published blogs (/blogs/owner/blogs) 
// with pagenation (/blogs/owner/blogs?page=1&limit=20)
// Also filterable by state (/blogs/owner/blogs?page=1&limit=20&state=published)
router.get('/owner/blogs', globalMiddlewares.authenticateToken, controller.getOwnerBlogs)

// Update blog state by id (/blogs/:id)
router.patch("/:id", globalMiddlewares.checkBody, globalMiddlewares.authenticateToken, controller.updateBlogState)

// Edit blog by id (/blogs/:id)
router.put("/:id", globalMiddlewares.checkBody, globalMiddlewares.authenticateToken, controller.editBlog)
    
// Delete blog by id (/blogs/:id)
router.delete("/:id", globalMiddlewares.authenticateToken, controller.deleteBlog )

module.exports = router
