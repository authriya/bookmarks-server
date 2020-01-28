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
        it(`responds with 401 Unauthorized for GET /api/bookmarks`, () => {
            return supertest(app)
              .get('/api/bookmarks')
              .expect(401, { error: 'Unauthorized request' })
          })
      
          it(`responds with 401 Unauthorized for POST /api/bookmarks`, () => {
            return supertest(app)
              .post('/api/bookmarks')
              .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
              .expect(401, { error: 'Unauthorized request' })
          })
      
          it(`responds with 401 Unauthorized for GET /api/bookmarks/:id`, () => {
            return supertest(app)
              .get(`/api/bookmarks/2`)
              .expect(401, { error: 'Unauthorized request' })
          })
      
          it(`responds with 401 Unauthorized for DELETE /api/bookmarks/:id`, () => {
            return supertest(app)
              .delete(`/api/bookmarks/1`)
              .expect(401, { error: 'Unauthorized request' })
            })
    })

    describe('GET /api/bookmarks', () => {
        context('The table is empty', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/bookmarks')
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

            it('GET /api/bookmarks responds 200 with all bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            })
        })
        context(`Given an XSS attack bookmark`, () => {
            const {maliciousBookmark, expectedBookmark} = fixtures.makeMaliciousBookmark()
            before('clean the table', () => db('bookmarks').truncate())
            beforeEach(`insert malicious bookmark`, () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBookmark])
            })
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/bookmarks`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedBookmark.title)
                        expect(res.body[0].description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })

    describe('GET /api/bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const bookmarkId = 1234
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark Not Found` } })
            })
        })
        context('The table has data', () => {
            const testBookmarks = fixtures.makeBookmarksArray()
            beforeEach('clean the table', () => db('bookmarks').truncate())
            beforeEach('insert articles', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
      
            it('GET /bookmark/:id responds with 200 and the specified bookmark', () => {
                const bookmarkId= 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            })

            it('responds with 200 and the specified bookmark', () => {
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId -1]
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            })
        })
        context(`Given an XSS attack bookmark`, () => {
            const {maliciousBookmark, expectedBookmark} = fixtures.makeMaliciousBookmark()
            
            before('clean the table', () => db('bookmarks').truncate())
            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBookmark])
            })
            it(`removes XSS attack content`, () => {
                return supertest(app)
                    .get(`/api/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title)
                        expect(res.body.description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })

    describe('DELETE /api/bookmarks/:id', () => {
        context(`Given no bookmarks`, () => {
            it(`responds 404 when bookmarks doesn't exist`, () => {
                return supertest(app)
                    .delete(`/api/bookmarks/123`)
                    .set(`Authorization`, `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: {message: `Bookmark Not Found`}
                    })
            })
        })
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = fixtures.makeBookmarksArray()
            before('clean the table', () => db('bookmarks').truncate())
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('removes the bookmark by ID from the store', () => {
                const idToRemove = 2
                const expectedBookmarks = testBookmarks.filter(bm => bm.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                            .get(`/api/bookmarks`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks)
                    )
            })
        })
    })
    describe('POST /api/bookmarks', () => {
        beforeEach('clean the table', () => db('bookmarks').truncate())
        it(`responds with 400 missing 'title' if not supplied`, () => {
            const newBookmarkMissingTitle = {
                url: 'https://test.com',
                rating: 1
            }
            return supertest(app)
                .post(`/api/bookmarks`)
                .send(newBookmarkMissingTitle)
                .set('Authorization', `Bearing ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: {message: `'title' is required`}
                })
        })

        it(`responds with 400 missing 'url' if not supplied`, () => {
            const newBookmarkMissingUrl = {
                title: 'test-title',
                rating: 1,
            }
            return supertest(app)
            .post(`/api/bookmarks`)
            .send(newBookmarkMissingUrl)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(400, {
              error: { message: `'url' is required` }
            })
        })
        it(`responds with 400 missing 'rating' if not supplied`, () => {
            const newBookmarkMissingRating = {
              title: 'test-title',
              url: 'https://test.com',
              // rating: 1,
            }
            return supertest(app)
              .post(`/api/bookmarks`)
              .send(newBookmarkMissingRating)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(400, {
                error: { message: `'rating' is required` }
              })
        })
        it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
            const newBookmarkInvalidRating = {
              title: 'test-title',
              url: 'https://test.com',
              rating: 8,
            }
            return supertest(app)
              .post(`/api/bookmarks`)
              .send(newBookmarkInvalidRating)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(400, {
                error: { message: `'rating' must be a number between 0 and 5` }
              })
        })
        it('adds a new bookmark to the store', () => {
            const newBookmark = {
              title: 'test-title',
              url: 'https://test.com',
              description: 'test description',
              rating: 1,
            }
            return supertest(app)
              .post(`/api/bookmarks`)
              .send(newBookmark)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(201)
              .expect(res => {
                expect(res.body.title).to.eql(newBookmark.title)
                expect(res.body.url).to.eql(newBookmark.url)
                expect(res.body.description).to.eql(newBookmark.description)
                expect(res.body.rating).to.eql(newBookmark.rating)
                expect(res.body).to.have.property('id')
              })
              .then(res =>
                supertest(app)
                  .get(`/api/bookmarks/${res.body.id}`)
                  .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                  .expect(res.body)
              )
        })
      
        it('removes XSS attack content from response', () => {
            const { maliciousBookmark, expectedBookmark } = fixtures.makeMaliciousBookmark()
            return supertest(app)
              .post(`/api/bookmarks`)
              .send(maliciousBookmark)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(201)
              .expect(res => {
                expect(res.body.title).to.eql(expectedBookmark.title)
                expect(res.body.description).to.eql(expectedBookmark.description)
              })
        })
    })
    describe.only(`PATCH /api/bookmarks/:bookmark_id`, () => {
        context(`Given no bookmarks`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 123456
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error: {message: `Bookmark Not Found`}})
            })
        })
        context(`Given bookmarks`, () => {
            const testBookmarks = fixtures.makeBookmarksArray()

            beforeEach('clean the table', () => db('bookmarks').truncate())

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            afterEach('cleanup', () => {
                db('bookmarks').truncate()
            })

            it('responds with 204 and updates the bookmark', () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'Sample Bookmark 2 two',
                    url: 'https://www.me.org',
                    description: 'Sample Bookmark description.',
                    rating: 2
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate -1],
                    ...updateBookmark
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    })
            })
            it(`responds with 400 when no required field is provided`, () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({ badField: 'foo'})
                    .expect(400, {
                        error: {
                            message: `Request body must contain either title, url, description or rating`
                        }
                    })
            })

            it(`responds 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'update bookmark title 3'
                }

                const expectedBookmark = {
                    ...testBookmarks[idToUpdate -1],
                    ...updateBookmark
                }

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({
                        ...updateBookmark,
                        fieldToIgnore: 'should not be in GET responds'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                        .get(`/api/bookmarks/${idToUpdate}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(expectedBookmark)
                        )
            })
        })
    })
})
