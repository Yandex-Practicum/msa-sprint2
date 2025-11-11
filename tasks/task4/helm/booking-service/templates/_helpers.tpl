{{- define "booking-service.name" -}}
booking-service
{{- end -}}

{{- define "booking-service.fullname" -}}
{{ .Release.Name }}
{{- end -}}

{{- define "booking-service.labels" -}}
app.kubernetes.io/name: {{ include "booking-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "booking-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "booking-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}