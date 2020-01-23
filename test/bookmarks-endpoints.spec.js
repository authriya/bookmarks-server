const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const fixtures = require('./bookmarks-fixtures')

describe.only('Bookmarks Endpoints', function() {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db('bookmarks').truncate())

    afterEach('cleanup', () => {
        db('bookmarks').truncate()
    })

    describe('Unauthorized requests', () =>{
        it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
            return supertest(app)
              .get('/bookmarks')
              .expect(401, { error: 'Unauthorized request' })
          })
      
          it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
            return supertest(app)
              .post('/bookmarks')
              .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
              .expect(401, { error: 'Unauthorized request' })
          })
      
          it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
            return supertest(app)
              .get(`/bookmarks/2`)
              .expect(401, { error: 'Unauthorized request' })
          })
      
          it(`responds with 401 Unauthorized for DELETE /bookmarks/:id`, () => {
            return supertest(app)
              .delete(`/bookmarks/1`)
              .expect(401, { error: 'Unauthorized request' })
            })
    })

    describe('GET /bookmarks', () => {
        context('The table is empty', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
            })
        })
        context('The table has data', () => {
            const testBookmarks = fixtures.makeBookmarksArray()
            beforeEach('insert articles', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('GET /bookmarks responds 200 with all bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            })
        })
    })

    describe('GET /bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const bookmarkId = 1234
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } })
            })
        })
        context('The table has data', () => {
            const testBookmarks = fixtures.makeBookmarksArray()
      
            it('GET /bookmark/:id responds with 200 and the specified bookmark', () => {
                const bookmarkId= 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            })
        })
    })
})
