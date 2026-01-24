HOST=$1
shift
TIMEOUT="${1:-15}"

echo "Waiting for $HOST for up to $TIMEOUT seconds..."
for i in $(seq $TIMEOUT); do
  nc -z ${HOST/:/ } && echo "✅ $HOST is up!" && exit 0
  sleep 1
done

echo "❌ Timeout waiting for $HOST"
exit 1