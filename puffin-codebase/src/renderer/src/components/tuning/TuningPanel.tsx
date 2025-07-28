import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FadeIn } from '@/components/ui/fade-in'
import { Brain, Database } from 'phosphor-react'

import DatasetEditor from './DatasetEditor'
import ModelTuner from './ModelTuner'

interface TuningPanelProps {
  className?: string
}

const TuningPanel: React.FC<TuningPanelProps> = ({ className }) => {
  // State for the selected dataset
  const [selectedDataset, setSelectedDataset] = useState<any>(null)

  return (
    <FadeIn className={className}>
      <div className="p-4 space-y-6">
        <Tabs defaultValue="datasets" className="w-full">
          <TabsList className="bg-gray-700/50 backdrop-blur-sm">
            <TabsTrigger value="datasets" className="data-[state=active]:bg-gray-700">
              <Database size={16} className="mr-2" />
              Training Datasets
            </TabsTrigger>
            <TabsTrigger value="tuning" className="data-[state=active]:bg-gray-700">
              <Brain size={16} className="mr-2" />
              Model Tuning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="datasets">
            <DatasetEditor
              selectedDataset={selectedDataset}
              onDatasetCreated={(dataset) => {
                setSelectedDataset(dataset)
              }}
            />
          </TabsContent>

          <TabsContent value="tuning">
            <ModelTuner />
          </TabsContent>
        </Tabs>
      </div>
    </FadeIn>
  )
}

export default TuningPanel
