gcloud run services update oasis-backend --region=asia-south1 --min-instances=0 --cpu=1 --memory=256Mi --concurrency=20 --cpu-throttling
(nenv) PS C:\Users\KIIT\Desktop\Project\Dev\services> gcloud run services update oasis-backend --region=asia-south1 --min-instances=0
OK Deploying... Done.
  OK Creating Revision...
  OK Routing traffic...
Done.
Service [oasis-backend] revision [oasis-backend-00010-n62] has been deployed and is serving 100 percent of traffic.
Service URL: https://oasis-backend-989700633460.asia-south1.run.app
(nenv) PS C:\Users\KIIT\Desktop\Project\Dev\services> gcloud run services describe 
oasis-backend --region=asia-south1
+ Service oasis-backend in region asia-south1
 
URL:     https://oasis-backend-989700633460.asia-south1.run.app
Ingress: all
Traffic:
  100% LATEST (currently oasis-backend-00010-n62)

Scaling: Auto (Min: 1)

Last updated on 2025-12-15T08:03:50.849257Z by coderairepublic@gmail.com:
  Revision oasis-backend-00010-n62
  Container nodeone-nodeone-1
    Image:           asia-south1-docker.pkg.dev/serene-vim-480310-r9/backend/nodeone-nodeone@sha256:76a0caf8e7be958fa2973521c0ad7a6c056c66b6332e80a2da9e93db8fc44594  
    Port:            3000
    Memory:          256Mi
    CPU:             1
    Env vars:
      ACCURACY_WEIGHT 1.2
      ATTEMPT_WINDOW_SIZE 15
      BACKEND_URL    https://oasis-backend-989700633460.asia-south1.run.app
      BETTER_AUTH_SECRET fKUEI8U4tvnRJnGCF3jkEcTcfgExRG3Z
      BETTER_AUTH_URL https://oasis-backend-989700633460.asia-south1.run.app
      FRONTEND_URL   https://oasis-989700633460.asia-south1.run.app
      MONGODB_URI    mongodb+srv://admin:admin@cluster0.mdbdj7e.mongodb.net/projectx?retryWrites=true&w=majority&appName=Cluster0
      NODE_ENV       production
      QUESTION_FETCH_LIMIT 10
      SIGMA_BOOST_BASE_BOOST 0.5
      SIGMA_BOOST_MAX_BOOST 1.0
      SIGMA_BOOST_MIN_HISTORY_SIZE 5
      SIGMA_BOOST_SIGMA_BASE 1.5
      TRUESKILL_BETA 200
      TRUESKILL_DRAW_PROBABILITY 0.00
      TRUESKILL_EPSILON 0.0001
      TRUESKILL_MU   25
      TRUESKILL_TAU  10
      USER_DEFAULT_MU 2.5
      USER_DEFAULT_SIGMA 3
      USER_RATING_DEFAULT 0
      USER_RATING_MAX 20000
      USER_RATING_MULTIPLIER 100
    Startup Probe:
      TCP every 240s
      Port:          3000
      Initial delay: 0s
      Timeout:       240s
      Failure threshold: 1
      Type:          Default
  Service account:   989700633460-compute@developer.gserviceaccount.com
  Concurrency:       20
  Max instances:     3
  Timeout:           300s
  CPU Allocation:    CPU is only allocated during request processing
(nenv) PS C:\Users\KIIT\Desktop\Project\Dev\services> gcloud run services describe 
oasis-backend --region=asia-south1
+ Service oasis-backend in region asia-south1
 
URL:     https://oasis-backend-989700633460.asia-south1.run.app
Ingress: all
Traffic:
  100% LATEST (currently oasis-backend-00010-n62)

Scaling: Auto (Min: 0, Max: 2)
 
Last updated on 2025-12-15T08:06:44.466552Z by coderairepublic@gmail.com:
  Revision oasis-backend-00010-n62
  Container nodeone-nodeone-1
    Image:           asia-south1-docker.pkg.dev/serene-vim-480310-r9/backend/nodeone-nodeone@sha256:76a0caf8e7be958fa2973521c0ad7a6c056c66b6332e80a2da9e93db8fc44594  
    Port:            3000
    Memory:          256Mi
    CPU:             1
    Env vars:
      ACCURACY_WEIGHT 1.2
      ATTEMPT_WINDOW_SIZE 15
      BACKEND_URL    https://oasis-backend-989700633460.asia-south1.run.app
      BETTER_AUTH_SECRET fKUEI8U4tvnRJnGCF3jkEcTcfgExRG3Z
      BETTER_AUTH_URL https://oasis-backend-989700633460.asia-south1.run.app
      FRONTEND_URL   https://oasis-989700633460.asia-south1.run.app
      MONGODB_URI    mongodb+srv://admin:admin@cluster0.mdbdj7e.mongodb.net/projectx?retryWrites=true&w=majority&appName=Cluster0
      NODE_ENV       production
      QUESTION_FETCH_LIMIT 10
      SIGMA_BOOST_BASE_BOOST 0.5
      SIGMA_BOOST_MAX_BOOST 1.0
      SIGMA_BOOST_MIN_HISTORY_SIZE 5
      SIGMA_BOOST_SIGMA_BASE 1.5
      TRUESKILL_BETA 200
      TRUESKILL_DRAW_PROBABILITY 0.00
      TRUESKILL_EPSILON 0.0001
      TRUESKILL_MU   25
      TRUESKILL_SIGMA 8
      TRUESKILL_TAU  10
      USER_DEFAULT_MU 2.5
      USER_DEFAULT_SIGMA 3
      USER_RATING_DEFAULT 0
      USER_RATING_MAX 20000
      USER_RATING_MULTIPLIER 100
    Startup Probe:
      TCP every 240s
      Port:          3000
      Initial delay: 0s
      Timeout:       240s
      Failure threshold: 1
      Type:          Default
  Service account:   989700633460-compute@developer.gserviceaccount.com
  Concurrency:       20
  Max instances:     3
  Timeout:           300s
  CPU Allocation:    CPU is only allocated during request processing


