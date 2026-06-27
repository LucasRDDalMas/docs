{{/*
Expand the name of the chart.
*/}}
{{- define "docs-poc.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "docs-poc.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "docs-poc.labels" -}}
helm.sh/chart: {{ include "docs-poc.name" . }}-{{ .Chart.Version }}
{{ include "docs-poc.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "docs-poc.selectorLabels" -}}
app.kubernetes.io/name: {{ include "docs-poc.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
