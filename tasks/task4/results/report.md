1. move check-dns.sh into task4/booking-service since they must be in the same folder as a Docker file;
2. add missing parts for helm charts:
   * specify additional variables;
   * use these variables in `deployment.yaml`;
   * provide 2 versions of values (`staging` and `prod`);
3. implement `.gitlab-ci.yml`;
4. deploy the booking service using helm: `helm upgrade --install booking-service helm/booking-service -f helm/booking-service/environment/values-staging.yaml`;
5. ensure dns-lookup is set correctly;
6. set up port forwarding for the booking service;
7. ensure the booking service is accessible through localhost (replies to pings).