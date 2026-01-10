import { Router } from 'express';
import { 
  createSyllabus, 
  getSyllabuses, 
  updateSyllabus, 
  deleteSyllabus 
} from '../controllers/syllabusController';

const router = Router();

router.route('/')
  .post(createSyllabus)
  .get(getSyllabuses);

router.route('/:id')
  .put(updateSyllabus)
  .delete(deleteSyllabus);

export default router;
