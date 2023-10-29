const mongoose = require('mongoose');
const BlogModel = require('../models/blog-model');
const logger = require('../logger');

const createBlog = async ({ title, description, author_id, tags, body }) => {
  try {
    logger.info('[CreateBlog] => Create blog process started...');
    const newBlog = { title, description, author_id, tags, body };
    const blog = await BlogModel.create(newBlog);
    logger.info('[CreateBlog] => Create blog process done.');

    return {
      code: 201,
      success: true,
      message: 'Blog created successfully',
      data: {
        blog,
      },
    };
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.title) {
      return {
        code: 409,
        success: false,
        message: 'A blog with this title already exists. Please use a different title.',
      };
    } else {
      logger.error(`[CreateBlog] => Error creating blog: ${error.message}`);
      return {
        code: 500,
        success: false,
        message: 'An error occurred while creating the blog.',
      };
    }
  }
};


const getAllPublishedBlogs = async (req, res) => {
  try {
    logger.info('[GetAllPublishedBlogs] => Get all published blogs process started...');

    const sortBy = req.query.sortBy || 'timestamp';
    const sortOrder = req.query.sortOrder || 'desc';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const totalCount = await BlogModel.countDocuments({ state: 'published' });
    const blogs = await BlogModel.find({ state: 'published' }).select('title description createdAt updatedAt').skip(skip).limit(limit).sort(sortOptions)
    
    const totalPages = Math.ceil(totalCount / limit);
    if (page > totalPages) {
      if (totalPages == 0){
        return{
          code: 404,
          message: 'There are no published blogs at this time.',
          currentPage: page,
          totalPages: totalPages,
        };
      }
      return {
        code: 404,
        message: 'No more pages',
        currentPage: page,
        totalPages: totalPages,
      };
    }
    logger.info('[GetAllPublishedBlogs] => Get all published blogs process done.');
    return {
      code: 200,
      message: 'All published blogs fetched successfully',
      blogs,
      currentPage: page,
      totalPages: totalPages,
    };
  } catch (error) {
    console.log(error);
    return {
      code: 500,
      message: 'Server Error',
      data: null,
    };
  }
};


const getBlogsBySearch = async (req, res) => {
  try {
    logger.info('[GetPublishedBlogsBySearch] => Get published blogs by search process started...');
    const query = req.query.query;

    const sortBy = req.query.sortBy || 'timestamp';
    const sortOrder = req.query.sortOrder || 'desc';
    
    if (!query) {
      return {
        code: 400,
        message: 'Search query is required as a query parameter.' 
      };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const caseInsensitiveQuery = new RegExp(query, 'i');

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const totalCount = await BlogModel.countDocuments({ 
      state: 'published', 
      $or: [
        { author: { $regex: caseInsensitiveQuery } },
        { title: { $regex: caseInsensitiveQuery } },
        { tags: { $regex: caseInsensitiveQuery } }
      ]
    });

    const blogs = await BlogModel.find({
      state: 'published', 
      $or: [
        { author: { $regex: caseInsensitiveQuery } },
        { title: { $regex: caseInsensitiveQuery } },
        { tags: { $regex: caseInsensitiveQuery } }
      ]
    }).select('title description createdAt updatedAt').skip(skip).limit(limit).sort(sortOptions);

    const totalPages = Math.ceil(totalCount / limit);
    if (page > totalPages) {
      if (totalPages == 0){
        return {
          code: 404,
          message: `There are no published blogs with "${query}" at this time.`,
          currentPage: page,
          totalPages: totalPages,
        };
      }
      return {
        code: 404,
        message: 'No more pages',
        currentPage: page,
        totalPages: totalPages,
      };
    }
    logger.info('[GetPublishedBlogsBySearch] => Get published blogs by search process done.');
    return {
      code: 201,
      message: `Published blogs with "${query}" fetched successfully`,
      blogs,
      currentPage: page,
      totalPages: totalPages,
    };
  } catch (error) {
    console.error(error);
    return {
      code: 500,
      message: 'Server Error',
      data: null,
    };
  }
};


const getPublishedBlogById = async (req, res) => {
  try {
    logger.info('[GetAPublishedBlog] => Get a published blog process started...');
    const blogId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return {
        code: 400,
        message: 'Invalid ID format'
      };
    }

    const blog = await BlogModel.findOneAndUpdate(
      { _id: blogId, state: 'published' },
      { $inc: { read_count: 1 } },
      { new: true }
    )

    if (!blog) {
      return {
        code:404,
        message: 'Blog not found or not published.' };
    }

    // Reading time based on the word count
    const wordsPerMinute = 250;
    const wordCount = blog.body.split(' ').length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    const readingTime = `${minutes} min(s)`;

    // Updating the reading_time field in the blog
    blog.reading_time = readingTime;
    await blog.save();

    logger.info('[GetAPublishedBlog] => Get a published blog process done.');
    return{
      code: 200,
      message: 'Published blog fetched successfully',
      blog
    }
  } catch (error) {
    return{ 
      code: 500,
      message: 'Server Error',
      data: null
    }
  }
};


const getOwnerBlogs = async (req, res) => {
  try {
    logger.info('[GetOwnerBlogs] => Get owner blogs process started...');
    const ownerId = req.user._id;
    const author_id = ownerId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const state = req.query.state || { $in: ['draft', 'published'] };

    const totalCount = await BlogModel.countDocuments({author_id, state: state});
    const blogs = await BlogModel.find({author_id, state: state}).select('title description state createdAt updatedAt').skip(skip).limit(limit);

    const totalPages = Math.ceil(totalCount / limit);
    if (page > totalPages) {
      return {
        code: 200,
        message: 'No more pages',
        currentPage: page,
        totalPages: totalPages,
      }
    }
    
    logger.info('[GetOwnerBlogs] => Get owner blogs process done.');
    return {
      code: 200,
      message: 'Blogs fetched successfully',
      blogs,
      currentPage: page,
      totalPages: totalPages,
    }
  } catch (error) {
    return {
      code: 500,
      message: 'Server Error',
      data: null,
    }
  }
};

const updateBlogState = async (req, res) => {
  try {
    logger.info('[UpdateBlogState] => Update blog state process started...')

    const blogId = req.params.id;
    const authorId = req.user._id

    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return {
        code: 400,
        message: 'Invalid ID format' }
    }

    const blog = await BlogModel.findOne({ _id: blogId, author_id: authorId });

    if (!blog) {
      return {
        code: 404,
        message: 'Blog not found or not authorized.'
      } 
    }

    blog.state = req.body.state || blog.state;

    const updatedBlog= await blog.save();

    logger.info('[UpdateBlogState] => Update blog state process done.')
    return {
      code: 200,
      message: 'Blog state updated successfully',
      data: updatedBlog,
    }
  } catch (error) {
    return {
      code: 500,
      message: 'Server Error',
      data: null
    }
  }
};

const editBlog = async (req, res) => {
  try {
    logger.info('[EditBlog] => Edit blog process started...')

    const blogId = req.params.id;
    const authorId = req.user._id

    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const blog = await BlogModel.findOne({ _id: blogId, author_id: authorId });

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found or not authorized' });
    }
    blog.title = req.body.title || blog.title;
    blog.description = req.body.description || blog.description;
    blog.tags = req.body.tags || blog.tags;
    blog.body = req.body.body || blog.body;

    const editedBlog= await blog.save();

    logger.info('[EditBlog] => Edit blog process done.')
    return {
      code: 200,
      message: 'Blog edited successfully',
      data: editedBlog,
    };
  } catch (error) {
    return {
      code: 500,
      message: 'Server Error',
      data: null
    };
  }
};

const deleteBlog = async (req, res) => {
  try {
    logger.info('[DeleteBlog] => Delete blog process started...');

    const blogId = req.params.id;
    const authorId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return {
        code: 400,
        message: 'Invalid ID format' 
      };
    }

    const deletedBlog = await BlogModel.findByIdAndRemove({ _id: blogId, author_id: authorId });

    if (!deletedBlog) {
      return {
      code: 404,
      message: 'Blog not found or not authorized.'
    };
    }

    logger.info('[DeleteBlog] => Delete blog process done.');
    return{
      code: 200,
      message: 'Blog deleted successfully.',
    };
  } catch (error) {
    return {
      code: 500,
      message: 'Server Error',
      data: null,
    };
  }
};


module.exports = {
  createBlog,
  getAllPublishedBlogs,
  getBlogsBySearch,
  getPublishedBlogById,
  updateBlogState,
  getOwnerBlogs,
  editBlog,
  deleteBlog,
}