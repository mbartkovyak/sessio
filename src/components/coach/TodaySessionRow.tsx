import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TrainingCard from '@/components/shared/TrainingCard';

export default function TodaySessionRow({ session }: { session: any }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const training = session.trainings;
  return (
    <TrainingCard
      training={{ ...training, start_time: session.start_time }}
      onClick={() => navigate(`/coach/trainings/${training?.id}`)}
      badge={
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent shrink-0">{t(`common:trainingType.${training?.type}`)}</span>
      }
    />
  );
}
