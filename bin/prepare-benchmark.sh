
#!/bin/bash

if [[ $COUCH_HOST == $EXPRESS_HOST && $CURRENT_HOST != $EXPRESS_HOST ]]; then
  # RUN ONCE
  export CURRENT_HOST=$EXPRESS_HOST
  # START EXPRESS
  node ./tests/misc/pouchdb-express-router.js >/dev/null 2>/dev/null &
  export EXPRESS_PID=$!

  WAITING=0
  until $(curl --output /dev/null --silent --head --fail --max-time 2 $EXPRESS_HOST); do
      if [ $WAITING -eq 4 ]; then
          if [[ ! -z $EXPRESS_PID ]]; then
            kill $EXPRESS_PID
          fi
          exit 1
      fi
      let WAITING=WAITING+1
      printf "."
      sleep 5
  done

elif [[ $COUCH_HOST == $NEXTJS_HOST && $CURRENT_HOST != $NEXTJS_HOST ]]; then
  # RUN ONCE
  export CURRENT_HOST=$NEXTJS_HOST

  # KILL EXPRESS
  EXIT_STATUS=$?
  if [[ ! -z $EXPRESS_PID ]]; then
    kill $EXPRESS_PID
  fi

  # START NEXTJS
  npm start --prefix ../pouchdb-nextjs-router -- --port 3001 >/dev/null 2>/dev/null &
  NEXTJS_PID=$!

  WAITING=0
  until $(curl --output /dev/null --silent --head --fail --max-time 2 $NEXTJS_HOST); do
      if [ $WAITING -eq 4 ]; then
          if [[ ! -z $NEXTJS_PID ]]; then
            kill $NEXTJS_PID
          fi
          exit 1
      fi
      let WAITING=WAITING+1
      printf "."
      sleep 5
  done
fi

# ALWAYS CLEAR LINUX CACHES BEFORE TIMING
sync; echo 3 > sudo tee /proc/sys/vm/drop_caches
