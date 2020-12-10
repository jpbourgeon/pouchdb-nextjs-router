#!/bin/bash

export CLIENT="node"

if [ "$BENCHMARK" == 1 ]; then

  #############
  # BENCHMARK #
  #############

  # START EXPRESS
  node ./tests/misc/pouchdb-express-router.js &
  export EXPRESS_PID=$!
  export EXPRESS_HOST="http://127.0.0.1:3000"

  printf "Waiting for EXPRESS to start ."
  WAITING=0
  until $(curl --output /dev/null --silent --head --fail --max-time 2 $EXPRESS_HOST); do
      if [ $WAITING -eq 4 ]; then
          echo "EXPRESS failed to start"
          if [[ ! -z $EXPRESS_PID ]]; then
            kill $EXPRESS_PID
          fi
          exit 1
      fi
      let WAITING=WAITING+1
      printf "."
      sleep 5
  done
  echo "EXPRESS started :)"

  # START NEXTJS
  npm start --prefix ../pouchdb-nextjs-router -- --port 3001 &
  NEXTJS_PID=$!
  export NEXTJS_HOST="http://127.0.0.1:3001/api/pouchdb"

  printf "Waiting for NEXTJS to start ."
  WAITING=0
  until $(curl --output /dev/null --silent --head --fail --max-time 2 $NEXTJS_HOST); do
      if [ $WAITING -eq 4 ]; then
          echo "NEXTJS failed to start"
          if [[ ! -z $NEXTJS_PID ]]; then
            kill $NEXTJS_PID
          fi
          exit 1
      fi
      let WAITING=WAITING+1
      printf "."
      sleep 5
  done
  echo "Host started :)"

  # BUILD AS NEEDED
  if [ "$BUILD" == 1 ]; then
    npm run build-node
  fi

  # RUN THE BENCHMARK
  hyperfine "COUCH_HOST=$EXPRESS_HOST bash ./bin/test-node.sh" "COUCH_HOST=$NEXTJS_HOST bash ./bin/test-node.sh"

  EXIT_STATUS=$?
  if [[ ! -z $EXPRESS_PID ]]; then
    kill $EXPRESS_PID
  fi

  if [[ ! -z $NEXTJS_PID ]]; then
    kill $NEXTJS_PID
  fi

else

  ########
  # TEST #
  ########

  if [ "$SERVER" == "express" ]; then
    node ./tests/misc/pouchdb-express-router.js &
    export SERVER_PID=$!
    export COUCH_HOST="http://127.0.0.1:3000"
  elif [ "$SERVER" == "pouchdb-nextjs-router" ]; then
    npm start --prefix ../$SERVER &
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

  if [ "$BUILD" == 1 ]; then
    npm run build-node
  fi

  if [ "$TIME" == 1 ]; then
      hyperfine "bash ./bin/test-node.sh"
  else
      bash ./bin/test-node.sh
  fi

  EXIT_STATUS=$?
  if [[ ! -z $SERVER_PID ]]; then
    kill $SERVER_PID
  fi

  exit $EXIT_STATUS

fi
