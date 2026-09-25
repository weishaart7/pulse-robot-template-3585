import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { useFamilleSubNav } from './useFamilleSubNav';

export default function MembresPage() {
  useFamilleSubNav('membres');

  return (
    <div className="pb-6 md:px-6">
      <LiensFamiliauxForm view="membres" />
    </div>
  );
}
