const supertest = require('supertest');
const app = require('../api');
const { connect } = require('./database')
const UserModel = require('../models/user-model')
const BlogModel = require('../models/blog-model')


jest.mock('../models/blog-model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

// Test Suite
describe('Creat Blog Route', () => {
  let connection
  let token
  //before hook
  beforeAll(async () => {
    connection = await connect()
  })

  beforeEach(async() => {
    // create a user
    const user = await UserModel.create({
      first_name: "Sen",
      last_name: "Samie",
      email: "sen@gmail.com",
      password: "12345678"
    });

    // login that user
    const response = await supertest(app)
    .post('/users/login')
    .set('content-type', 'application/json')
    .send({
      email: "sen@gmail.com",
      password: "12345678"
    })

    // store the token in a global object
    token = response.body.token

  })

  afterEach(async () => {
    await connection.cleanup()
  })

  //after hook
  afterAll(async () => {
    await connection.disconnect()
  })

  // Test Case 1
  it('should successfully create a blog', async () => {
    const req = {
      body: {
        title: "The Life of Man.",
        description: "Description of a man.",
        tags: ["Man", "Manhood"],
        body: "The Life of Man. Description of a man."
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    BlogModel.findOne.mockResolvedValue(null);
    BlogModel.create.mockResolvedValue(req.body);

    const response = await supertest(app)
    .post('/blogs')
    .set('authorization', `Bearer ${token}`)
    .set('content-type', 'application/json')

    // Assertion
    expect(response.status).toEqual(201)
    expect(response.body).toMatchObject({ 
      message: 'Blog created successfully',
      data: req.body
    });
  })
  
  // Test Case 2
  it('should not successfully create a blog if blog already exists', async () => {
    const req = {
      body: {
        title: "The Life of Man.",
        description: "Description of a man.",
        tags: ["Man", "Manhood"],
        body: "The Life of Man. Description of a man."
      }
    };

    BlogModel.findOne.mockResolvedValue({title: "The Life of Man."});
    
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };

    BlogModel.create.mockResolvedValue(req.body);

    const response = await supertest(app)
    .post('/blogs')
    .set('authorization', `Bearer ${token}`)
    .set('content-type', 'application/json')

    // Assertion
    expect(response.status).toEqual(409)
    expect(response.body).toMatchObject({ 
      message: 'Blog already created.'
    });
  })


})
