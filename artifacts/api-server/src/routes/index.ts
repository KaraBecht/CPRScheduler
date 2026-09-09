import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import classesRouter from "./classes";
import rosterRouter from "./roster";
import enrollmentsRouter from "./enrollments";
import requestsRouter from "./requests";
import certificatesRouter from "./certificates";
import dashboardRouter from "./dashboard";
import placesRouter from "./places";
import locationsRouter from "./locations";
import remindersRouter from "./reminders";
import trainerInvitesRouter from "./trainerInvites";
import adminRouter from "./admin";
import inquiriesRouter from "./inquiries";
import checklistsRouter from "./checklists";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(classesRouter);
router.use(rosterRouter);
router.use(enrollmentsRouter);
router.use(requestsRouter);
router.use(certificatesRouter);
router.use(dashboardRouter);
router.use(placesRouter);
router.use(locationsRouter);
router.use(remindersRouter);
router.use(trainerInvitesRouter);
router.use(adminRouter);
router.use(inquiriesRouter);
router.use(checklistsRouter);

export default router;
