// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { AssetFormValues } from '@/schemas/assetSchema';
import { OrigineFields } from './OrigineQualificationFields';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const maritalContext = { statutCouple: 'Marié(e)', regimeMatrimonial: 'Communauté réduite aux acquêts' };

const Harness = ({ origine }: { origine: string }) => {
  const form = useForm<AssetFormValues>({
    defaultValues: { nature: 'Résidence principale', origine_actif: [origine] } as Partial<AssetFormValues> as AssetFormValues,
  });
  return (
    <Form {...form}>
      <OrigineFields form={form} maritalContext={maritalContext} />
    </Form>
  );
};

afterEach(() => cleanup());

describe('OrigineFields — clauses selon l\'origine', () => {
  it('un achat propose la clause de remploi et le financement mixte', () => {
    render(<Harness origine="Acquisition à titre onéreux" />);
    expect(screen.getByText('Clause de remploi actée')).toBeInTheDocument();
    expect(screen.getByText(/Financement mixte/)).toBeInTheDocument();
  });

  it('un échange propose la clause de remploi mais pas le financement mixte', () => {
    render(<Harness origine="Échange" />);
    expect(screen.getByText('Clause de remploi actée')).toBeInTheDocument();
    expect(screen.queryByText(/Financement mixte/)).not.toBeInTheDocument();
  });

  it("une donation ne propose pas la clause de remploi", () => {
    render(<Harness origine="Donation" />);
    expect(screen.queryByText('Clause de remploi actée')).not.toBeInTheDocument();
  });
});
