import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { useFamilleSubNav } from './useFamilleSubNav';

export default function MembresPage() {
  useFamilleSubNav('membres');

  return (
    <div>
      <LiensFamiliauxForm view="membres" />
    </div>
  );
}
