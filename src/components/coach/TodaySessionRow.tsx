import { useNavigate } from 'react-router-dom';
import TrainingCard from '@/components/shared/TrainingCard';

export default function TodaySessionRow({ session }: { session: any }) {
  const navigate = useNavigate();
  const training = session.trainings;
  return (
    <TrainingCard
      training={{ ...training, start_time: session.start_time }}
      onClick={() => navigate(`/coach/trainings/${training?.id}`)}
      badge={
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize shrink-0">{training?.type}</span>
      }
    />
  );
}
