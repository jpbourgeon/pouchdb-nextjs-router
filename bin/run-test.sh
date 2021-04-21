#!/bin/bash

export CLIENT="node"
if [ -z $WARMUP ]; then
      export WARMUP=1
fi
if [ -z $MINRUNS ]; then
      export MINRUNS=2
fi

if [ "$BENCHMARK" == 1 ]; then

  #############
  # BENCHMARK #
  #############

  fuser -k -n tcp 3000
  fuser -k -n tcp 3001

  # RUN THE BENCHMARK
  export EXPRESS_HOST="http://127.0.0.1:3000"
  export NEXTJS_HOST="http://127.0.0.1:3001/api/pouchdb"
  export CURRENT_HOST=""
  hyperfine --export-markdown /workspaces/pouchdb-nextjs-router/perf.md  --warmup $WARMUP --min-runs $MINRUNS --prepare "COUCH_HOST=$EXPRESS_HOST bash ./bin/prepare-benchmark.sh" --prepare "COUCH_HOST=$NEXTJS_HOST bash ./bin/prepare-benchmark.sh" "SERVER=express COUCH_HOST=$EXPRESS_HOST bash ./bin/test-node.sh" "SERVER=pouchdb-nextjs-router COUCH_HOST=$NEXTJS_HOST bash ./bin/test-node.sh"
  # hyperfine --export-markdown /workspaces/pouchdb-nextjs-router/perf.md "SERVER=express COUCH_HOST=$EXPRESS_HOST bash ./bin/test-node.sh" "SERVER=pouchdb-nextjs-router COUCH_HOST=$NEXTJS_HOST bash ./bin/test-node.sh"

  # FINALLY, KILL HOSTS
    fuser -k -n tcp 3000
    fuser -k -n tcp 3001

else

  ########
  # TEST #
  ########

  if [ "$SERVER" == "express" ]; then
    fuser -k -n tcp 3000
    node ./tests/misc/pouchdb-express-router.js >/dev/null 2>/dev/null &
    export SERVER_PID=$!
    export COUCH_HOST="http://127.0.0.1:3000"
  elif [ "$SERVER" == "pouchdb-nextjs-router" ]; then
    fuser -k -n tcp 3000
    npm start --prefix ../$SERVER >/dev/null 2>/dev/null &
    export SERVER_PID=$!
    export COUCH_HOST="http://127.0.0.1:3000/api/pouchdb"
  else
    export SERVER="custom-config"
  fi

  echo -e "CLIENT: $CLIENT"
  echo -e "HOST: $COUCH_HOST"
  echo -e "CONFIG: $SERVER"

  printf "Waiting for host to start ."
  WAITING=0
  until $(curl --output /dev/null --silent --head --fail --max-time 2 $COUCH_HOST); do
      if [ $WAITING -eq 4 ]; then
          echo "Host failed to start"
          if [[ ! -z $SERVER_PID ]]; then
            # kill $SERVER_PID
            fuser -k -n tcp 3000
          fi
          exit 1
      fi
      let WAITING=WAITING+1
      printf "."
      sleep 5
  done
  echo "Host started :)"

  if [ "$TIME" == 1 ]; then
      hyperfine --export-markdown /workspaces/pouchdb-nextjs-router/perf.md  --warmup $WARMUP --min-runs $MINRUNS --prepare "sync; echo 3 > sudo tee /proc/sys/vm/drop_caches" "bash ./bin/test-node.sh"
  else
      bash ./bin/test-node.sh
  fi

  EXIT_STATUS=$?
  if [[ ! -z $SERVER_PID ]]; then
    # kill $SERVER_PID
    fuser -k -n tcp 3000
  fi

  exit $EXIT_STATUS

fi
