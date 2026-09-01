helm template booking-service ./helm/booking-service -f ./helm/booking-service/values-staging.yaml --set image.tag=1.0.0
helm lint ./helm/booking-service -f ./helm/booking-service/values-staging.yaml
helm lint ./helm/booking-service -f ./helm/booking-service/values-prod.yaml
helm lint ./helm/booking-service -f ./helm/booking-service/values.yaml