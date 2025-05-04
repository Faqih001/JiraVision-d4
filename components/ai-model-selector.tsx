"use client"

import { useState, useEffect } from "react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { AIModelType, AI_MODELS, AIModelSettings, DEFAULT_AI_SETTINGS } from "@/lib/ai-models"
import { useForm } from "react-hook-form"
import { Sparkles, Brain, Settings2 } from "lucide-react"

interface AIModelSelectorProps {
  onModelChange?: (model: AIModelType) => void;
  onSettingsChange?: (settings: AIModelSettings) => void;
  initialSettings?: AIModelSettings;
}

export default function AIModelSelector({
  onModelChange,
  onSettingsChange,
  initialSettings = DEFAULT_AI_SETTINGS
}: AIModelSelectorProps) {
  const [settings, setSettings] = useState<AIModelSettings>(initialSettings)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Setup form
  const form = useForm<AIModelSettings>({
    defaultValues: settings
  })

  // Update form when initialSettings change
  useEffect(() => {
    form.reset(initialSettings)
    setSettings(initialSettings)
  }, [initialSettings, form])

  // Handle model change
  const handleModelChange = (value: AIModelType) => {
    const newSettings = { ...settings, model: value }
    setSettings(newSettings)
    onModelChange?.(value)
    onSettingsChange?.(newSettings)
  }

  // Handle form submission
  const onSubmit = (data: AIModelSettings) => {
    setSettings(data)
    onSettingsChange?.(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span>AI Model Configuration</span>
        </CardTitle>
        <CardDescription>
          Select and configure the AI model for your JiraVision assistant
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Model Selector */}
          <div className="space-y-2">
            <label htmlFor="model-select" className="text-sm font-medium">
              Model
            </label>
            <Select
              value={settings.model}
              onValueChange={(value) => handleModelChange(value as AIModelType)}
            >
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AIModelType).map((modelType) => (
                  <SelectItem key={modelType} value={modelType}>
                    <div className="flex items-center justify-between w-full">
                      <span>{AI_MODELS[modelType].name} {AI_MODELS[modelType].version}</span>
                      {modelType === AIModelType.GRANITE && (
                        <Badge variant="outline" className="ml-2">Default</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Selected Model Info */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-1">{AI_MODELS[settings.model].name} {AI_MODELS[settings.model].version}</h3>
              <p className="text-sm text-muted-foreground mb-2">{AI_MODELS[settings.model].description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {AI_MODELS[settings.model].supportedLanguages.map((lang) => (
                  <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Advanced Settings</span>
            </div>
            <Switch
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
            />
          </div>

          {/* Advanced Settings Form */}
          {showAdvanced && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature: {field.value?.toFixed(1)}</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value || 0.7]}
                          min={0}
                          max={1}
                          step={0.1}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        Lower values produce more focused and deterministic responses.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Tokens</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum length of the AI response.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="topP"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Top P: {field.value?.toFixed(2)}</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value || 0.95]}
                          min={0.1}
                          max={1}
                          step={0.05}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        Controls diversity via nucleus sampling.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {settings.model === AIModelType.GRANITE && (
                  <FormField
                    control={form.control}
                    name="thinking"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Thinking</FormLabel>
                          <FormDescription>
                            Allows the model to display its reasoning process
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <Button 
                  type="submit" 
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Apply Settings
                </Button>
              </form>
            </Form>
          )}
        </div>
      </CardContent>
    </Card>
  )
}