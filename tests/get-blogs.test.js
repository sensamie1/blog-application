const supertest = require('supertest');
const app = require('../api');
const { connect } = require('./database');
const mongoose = require('mongoose');
const BlogModel = require('../models/blog-model');

// without the sort and pagenation
// jest.mock('../models/blog-model', () => ({
//   countDocuments: jest.fn().mockResolvedValue(30), 
//   find: jest.fn().mockResolvedValue([]),
// }));


// With the sort and pagenation
jest.mock('../models/blog-model', () => ({
  countDocuments: jest.fn().mockResolvedValue(30),
  find: jest.fn(() => ({
    select: jest.fn().mockReturnThis([]),
    skip: jest.fn().mockReturnThis([]),
    limit: jest.fn().mockReturnThis([]),
    sort: jest.fn().mockReturnThis([]),
    exec: jest.fn().mockResolvedValue([])
  })),
}));

// Test suite 1
describe('Get Blog Route', () => {
  let connection;
  // before hook
  beforeAll(async () => {
    connection = await connect()
  })

  afterEach(async () => {
    await connection.cleanup()
  })
  
  // after hook
  afterAll(async () => {
    await connection.disconnect()
  })

  // test case 1
  it('should return a list of published blogs', async () => {
    const response = await supertest(app).get('/blogs')
    .set('content-type', 'application/json')

    // Assertion
    expect(response.status).toEqual(200);
    expect(response.body).toMatchObject({
      // With the sort and pagenation
      blogs: expect.any(Object), 
      currentPage: expect.any(Number),
      message: 'All published blogs fetched successfully',
      totalPages: expect.any(Number)
      
      // without the sort and pagenation
      // blogs: expect.any(Array),
      // currentPage: expect.any(Number),
      // message: 'All published blogs fetched successfully',
      // totalPages: expect.any(Number)
    });
  });
})