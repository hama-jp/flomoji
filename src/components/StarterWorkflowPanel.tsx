import React from 'react';

import { ArrowRight, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { StarterWorkflowTemplate } from '../data/starterWorkflowTemplates';

interface StarterWorkflowPanelProps {
  templates: StarterWorkflowTemplate[];
  onApplyTemplate: (templateId: string) => void;
  onDismiss: () => void;
  variant?: 'overlay' | 'inline';
  title?: string;
  description?: string;
  badgeLabel?: string;
  applyLabel?: string;
  dismissLabel?: string;
  dismissDescription?: string;
}

const StarterWorkflowPanel = ({
  templates,
  onApplyTemplate,
  onDismiss,
  variant = 'overlay',
  title = 'Start with a working workflow instead of a blank canvas',
  description = 'Pick a template to load nodes, prompts, and outputs in one step. You can edit everything after it lands on the canvas.',
  badgeLabel = 'Starter Workflows',
  applyLabel = 'Use Template',
  dismissLabel = 'Continue with Blank Canvas',
  dismissDescription = 'Prefer to build from scratch? Keep the blank canvas and drag nodes from the left sidebar whenever you are ready.',
}: StarterWorkflowPanelProps) => {
  const isOverlay = variant === 'overlay';

  const panelContent = (
    <Card
      className={cn(
        'border-slate-200 bg-white/95 backdrop-blur',
        isOverlay ? 'shadow-xl' : 'border-0 bg-transparent shadow-none'
      )}
    >
      <CardHeader
        className={cn(
          'bg-gradient-to-r from-slate-50 to-blue-50/70',
          isOverlay ? 'border-b border-slate-100' : 'px-0 pt-0 pb-6'
        )}
      >
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Sparkles className="h-4 w-4" />
          {badgeLabel}
        </div>
        <CardTitle className="text-2xl text-slate-900">
          {title}
        </CardTitle>
        <CardDescription className="max-w-3xl text-sm text-slate-600">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn('space-y-6', isOverlay ? 'p-6' : 'px-0 pb-0')}>
        <div className="grid gap-4 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex h-full flex-col border-slate-200 shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-3xl leading-none">{template.icon}</div>
                  <Badge variant="outline" className="text-xs text-slate-600">
                    {template.setupLabel}
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-900">{template.name}</CardTitle>
                  <CardDescription className="mt-2 text-sm text-slate-600">
                    {template.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-5">
                <div className="space-y-2">
                  {template.highlights.map((highlight) => (
                    <div key={highlight} className="text-sm text-slate-600">
                      {highlight}
                    </div>
                  ))}
                </div>
                <Button onClick={() => onApplyTemplate(template.id)} className="w-full justify-between">
                  {applyLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <div className="text-sm text-slate-600">
            {dismissDescription}
          </div>
          <Button variant="outline" onClick={onDismiss}>
            {dismissLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!isOverlay) {
    return panelContent;
  }

  return (
    <div className="absolute inset-0 z-40 pointer-events-none px-6 pt-24 pb-8">
      <div className="mx-auto max-w-6xl pointer-events-auto">
        {panelContent}
      </div>
    </div>
  );
};

export default StarterWorkflowPanel;
