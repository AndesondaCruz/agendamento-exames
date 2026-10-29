import { useDoctors } from '../../../api/hooks';
import type { Doctor } from '../../../api/types';
import { OptionCard } from '../../../components/OptionCard';
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../../components/StatusViews';
import { describeWeekdays } from '../../../lib/dates';

interface DoctorListProps {
  selected?: Doctor;
  onSelect: (doctor: Doctor) => void;
}

export function DoctorList({ selected, onSelect }: DoctorListProps) {
  const { data: doctors, isPending, isError, error, refetch } = useDoctors();

  if (isPending) return <Skeleton rows={3} className="h-16" />;
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (doctors.length === 0)
    return <EmptyState title="Nenhum médico disponível no momento." />;

  return (
    <fieldset>
      <legend className="sr-only">Médicos</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {doctors.map((doctor) => (
          <OptionCard
            key={doctor.id}
            name="doctor"
            value={String(doctor.id)}
            checked={selected?.id === doctor.id}
            onChange={() => onSelect(doctor)}
          >
            <span className="block font-medium text-slate-800">
              {doctor.name}
            </span>
            <span className="block text-xs text-slate-600">{doctor.crm}</span>
            <span className="mt-1 block text-sm text-slate-600">
              Atende: {describeWeekdays(doctor.workingWeekdays)}
            </span>
          </OptionCard>
        ))}
      </div>
    </fieldset>
  );
}
