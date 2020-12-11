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

  # RUN THE BENCHMARK
  export EXPRESS_HOST="http://127.0.0.1:3000"
  export NEXTJS_HOST="http://127.0.0.1:3001/api/pouchdb"
  export CURRENT_HOST=""
  hyperfine --export-markdown /usr/src/perf.md  --warmup $WARMUP --min-runs $MINRUNS --prepare "COUCH_HOST=$EXPRESS_HOST bash ./bin/prepare-benchmark.sh" --prepare "COUCH_HOST=$NEXTJS_HOST bash ./bin/prepare-benchmark.sh" "COUCH_HOST=$EXPRESS_HOST bash ./bin/test-node.sh" "COUCH_HOST=$NEXTJS_HOST bash ./bin/test-node.sh"

  # FINALLY, KILL NEXTJS
  if [[ ! -z $NEXTJS_PID ]]; then
    kill $NEXTJS_PID
  fi

else

  ########
  # TEST #
  ########

  if [ "$SERVER" == "express" ]; then
    node ./tests/misc/pouchdb-express-router.js >/dev/null 2>/dev/null &
    export SERVER_PID=$!
    export COUCH_HOST="http://127.0.0.1:3000"
  elif [ "$SERVER" == "pouchdb-nextjs-router" ]; then
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
            kill $SERVER_PID
          fi
          exit 1
      fi
      let WAITING=WAITING+1
      printf "."
      sleep 5
  done
  echo "Host started :)"

  if [ "$TIME" == 1 ]; then
      hyperfine --export-markdown /usr/src/perf.md  --warmup $WARMUP --min-runs $MINRUNS --prepare "sync; echo 3 > sudo tee /proc/sys/vm/drop_caches" "bash ./bin/test-node.sh"
  else
      bash ./bin/test-node.sh
  fi

  EXIT_STATUS=$?
  if [[ ! -z $SERVER_PID ]]; then
    kill $SERVER_PID
  fi

  exit $EXIT_STATUS

fi
