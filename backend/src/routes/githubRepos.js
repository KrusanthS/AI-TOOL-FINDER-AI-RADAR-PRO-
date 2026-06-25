import express from 'express';
import githubRepoController from '../controllers/githubRepoController.js';

const router = express.Router();

router.get('/for-tool', githubRepoController.getReposForTool);
router.get('/categories', githubRepoController.getRepoCategories);
router.get('/:slug', githubRepoController.getRepoBySlug);
router.get('/', githubRepoController.getRepos);

export default router;
