import { useProfile } from '../../contexts/ProfileContext';
import { AutoPreference } from './AutoPreference';

export function SettingsForm() {
  const { profile, isLoading } = useProfile();
  const timezones = [
    { value: 'America/Sao_Paulo', label: 'Brasília / São Paulo (UTC-3)' },
    { value: 'America/Manaus', label: 'Manaus / Amazonas (UTC-4)' },
    { value: 'America/Cuiaba', label: 'Cuiabá / Mato Grosso (UTC-4)' },
    { value: 'America/Belem', label: 'Belém / Pará (UTC-3)' },
    { value: 'America/Fortaleza', label: 'Fortaleza / Nordeste (UTC-3)' },
    { value: 'America/Recife', label: 'Recife / Pernambuco (UTC-3)' },
    { value: 'America/Rio_Branco', label: 'Rio Branco / Acre (UTC-5)' },
    { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
    { value: 'Europe/Lisbon', label: 'Lisboa / Portugal (WET/WEST)' },
    { value: 'UTC', label: 'Tempo Universal Coordenado (UTC)' },
  ];

  if (!profile)
    return (
      <p role="status">
        {isLoading ? 'Carregando configurações…' : 'Não foi possível carregar o perfil.'}
      </p>
    );
  return (
    <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
      <AutoPreference field="name" label="Nome de exibição" />
      <AutoPreference field="timezone" label="Fuso horário" options={timezones} />
      <AutoPreference
        field="theme"
        label="Aparência"
        fallback="system"
        options={[
          { value: 'system', label: 'Seguir o navegador' },
          { value: 'light', label: 'Claro' },
          { value: 'dark', label: 'Escuro' },
        ]}
      />
    </section>
  );
}
