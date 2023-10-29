const supertest = require('supertest');
const app = require('../api');
const { connect } = require('./database')
const UserModel = require('../models/user-model')

// Test Suite
describe('Authentication Tests', () => {
  let connection
  //before hook
  beforeAll(async () => {
    connection = await connect()
  })

  afterEach(async () => {
    await connection.cleanup()
  })

  //after hook
  afterAll(async () => {
    await connection.disconnect()
  })

  // Test Case
  it('should successfully register a user', async () => {
    const response = await supertest(app)
    .post('/users/signup')
    .set('content-type', 'application/json')
    .send({
      first_name: "Sen",
      last_name: "Samie",
      email: "sen@gmail.com",
      password: "12345678"
    })
    // expextations
    expect(response.status).toEqual(201)
    expect(response.body.user).toMatchObject({ 
      first_name: "Sen",
      last_name: "Samie",
      email: "sen@gmail.com",
    });
  })


  // Test Case
  it('should successfully login a user', async () => {
    await UserModel.create({
      first_name: "Sen",
      last_name: "Samie",
      email: "sen@gmail.com",
      password: "12345678"
    });

    const response = await supertest(app)
    .post('/users/login')
    .set('content-type', 'application/json')
    .send({
      email: "sen@gmail.com",
      password: "12345678"
    })

    // expectations
    expect(response.status).toEqual(200);
    expect(response.body).toMatchObject({
        message: 'Login successful',
        token: expect.any(String),
        user: expect.any(Object)
    })

    expect(response.body.user.first_name).toEqual('Sen');
    expect(response.body.user.last_name).toEqual('Samie');
    expect(response.body.user.email).toEqual('sen@gmail.com');
  })

  //Test Case
  it('should not successfully login a user, when user does not exist', async () => {
    await UserModel.create({
      first_name: "Sen",
      last_name: "Samie",
      email: "sen@gmail.com",
      password: "12345678"
    });

    const response = await supertest(app)
    .post('/users/login')
    .set('content-type', 'application/json')
    .send({
      email: "sen22222@gmail.com",
      password: "12345678"
    })

    // expectations
    expect(response.status).toEqual(404);
    expect(response.body).toMatchObject({
      message: 'User not found',
    })
  })

})
