-- Allow confirmation_window_hours to be NULL (meaning "no deadline / no reminders").
ALTER TABLE public.trainings ALTER COLUMN confirmation_window_hours DROP NOT NULL;
ALTER TABLE public.trainings ALTER COLUMN confirmation_window_hours SET DEFAULT NULL;
