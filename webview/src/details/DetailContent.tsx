import { FileText } from 'lucide-react';
import { Badge } from '../components';
import { useL10n } from '../l10n';
import type { PluginDetailData } from './DetailsApp';
import ComponentsSection from './ComponentsSection';
import ReadmeSection from './ReadmeSection';

interface DetailContentProps {
  plugin: PluginDetailData;
  onOpenFile: (filePath: string) => void;
}

export default function DetailContent({ plugin, onOpenFile }: DetailContentProps) {
  const { t } = useL10n();

  return (
    <div className="space-y-6">
      {plugin.description && (
        <div className="p-4 rounded-lg border border-border bg-card">
          <h5 className="text-base font-semibold m-0 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t('content.description')}
          </h5>
          <p className="text-sm mb-0 mt-3">{plugin.description}</p>
        </div>
      )}

      <ComponentsSection plugin={plugin} onOpenFile={onOpenFile} />

      <ReadmeSection readme={plugin.readme} />

      {(plugin.dependencies?.length || plugin.license) && (
        <div className="p-4 rounded-lg border border-border bg-card">
          <h5 className="text-base font-semibold m-0">{t('content.meta')}</h5>
          {plugin.dependencies?.length && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground mb-2">{t('content.dependencies')}:</p>
              <div className="flex flex-wrap gap-2">
                {plugin.dependencies.map(dep => (
                  <Badge key={dep} variant="default">{dep}</Badge>
                ))}
              </div>
            </div>
          )}
          {plugin.license && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('content.license')}:</span>
              <Badge variant="default">{plugin.license}</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
