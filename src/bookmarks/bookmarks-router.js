const express = require('express')
const uuid = require('uuid/v4')
const logger = require('../logger')
const store = require('../store.js')

const bookmarkRouter = express.Router()
const bodyParser = express.json()

bookmarkRouter
  .route('/bookmarks')
  .get((req, res) => {
    res
    .json(store);
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
  .route('/bookmarks/:id')
  .get((req, res) => {
    const {id} = req.params;
    const bookmark = store.find(b => b.id == id)

    if (!bookmark) {
        logger.error(`Bookmark with id ${id} not found.`)
        return res
        .status(404)
        .json({error: {message: `Bookmark Not Found`}})
    }
    res.json(bookmark);
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