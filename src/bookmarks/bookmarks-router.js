const express = require('express')
const uuid = require('uuid/v4')
const logger = require('../logger')
const store = require('../store.js')
const BookmarksService = require('../../bookmarks-service')

const bookmarkRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: bookmark.title,
  url: bookmark.url,
  description: bookmark.description,
  rating: Number(bookmark.rating),
})

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks)
      })
      .catch(next)
  })
  .post(bodyParser, (req, res) => {
    const { title, url, desc="", rating } = req.body

    if (!title) {
      logger.error(`Title is required`);
      return res
        .status(400)
        .send('Title is required');
    }
    
    if (!url) {
      logger.error(`Url is required`);
      return res
        .status(400)
        .send('url is required');
    }
    
    if (!rating) {
      logger.error(`Rating is required`);
      return res
        .status(400)
        .send('Rating is required');
    }
  
    if(!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating ${rating} supplied`)
      return res
        .status(400)
        .send(`Rating must be a number between 0 and 5`)
    }
  
    const id = uuid();
  
    const bookmark = {
      id,
      title,
      url,
      desc,
      rating
    };
  
    store.push(bookmark)
  
    logger.info(`Bookmark with id ${id} created`)

    res
        .status(201)
        .location(`http://localhost:8000/bookmarks/${bookmark.id}`)
        .json(bookmark)
  })

bookmarkRouter
  .route('/bookmarks/:bookmark_id')
  .get((req, res, next) => {
    const {bookmark_id} = req.params
    console.log(bookmark_id)
    BookmarksService.getById(req.app.get('db'), bookmark_id)
      .then(bookmark => {
        if(!bookmark) {
          return res.status(404).json({
            error: {message: `Bookmark doesn't exist`}
          })
        }
        res.json(bookmark)
      })
      .catch(next)
  })
  .delete((req, res) => {
    const {id} = req.params

  const index = store.findIndex(b => b.id == id);

  if (index === -1) {
    logger.error(`Bookmark with id ${id} not found`)
    return res
      .status(404)
      .send('Not Found')
  }

  store.splice(index, 1)

  logger.info(`Bookmark with id ${id} deleted`)
  res
    .status(204)
    .end();
  })

module.exports = bookmarkRouter