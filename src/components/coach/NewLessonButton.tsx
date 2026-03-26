import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

export default function NewLessonButton() {
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  return (
    <button
      onClick={() => navigate('/coach/trainings/new')}
      className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground transition-all active:scale-[0.97]"
    >
      <Plus className="h-3.5 w-3.5" /> {t('trainings.new')}
    </button>
  );
}
