import type { Blocker } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface Props {
  blocker: Blocker;
  /** Called right before proceeding with navigation (e.g. clear draft) */
  onDiscard?: () => void;
}

export default function UnsavedChangesDialog({ blocker, onDiscard }: Props) {
  if (blocker.state !== 'blocked') return null;

  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes that will be lost if you leave this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={() => blocker.reset?.()}
            className="flex-1 mt-0 sm:mt-0"
          >
            Stay
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDiscard?.();
              blocker.proceed?.();
            }}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
