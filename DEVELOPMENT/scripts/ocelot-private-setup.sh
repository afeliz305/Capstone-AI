#!/bin/sh
# One-time owner-only preparation. No uploads, recursive chmod, or data resets.
set -eu
cd
account_dir=$(pwd -P)
case "$account_dir" in
  /|*/public_html|*/public_html/*) printf '%s\n' 'Unsafe account home; stopping.'; exit 1 ;;
esac
private_dir="$account_dir/.capstone-chat-private"
printf '%s\n' 'SSH account (this is NOT necessarily the PHP web account):'
id
printf '%s\n' 'Directory permissions:'
ls -ld -- "$account_dir"
if [ -d "$account_dir/public_html" ]; then
  ls -ld -- "$account_dir/public_html"
else
  printf '%s\n' 'public_html is missing. No storage changes made.'
  exit 1
fi
if [ "$(stat -c %u -- "$account_dir")" != "$(id -u)" ]; then
  printf '%s\n' 'This SSH account does not own its home. Ask hosting support.'
  exit 1
fi
if [ -L "$private_dir" ]; then
  printf '%s\n' 'Private storage is a symbolic link. No changes made; ask hosting support.'
  exit 1
fi
if [ -e "$private_dir" ]; then
  if [ ! -d "$private_dir" ]; then
    printf '%s\n' 'The private-storage path is not a directory. No changes made.'
    exit 1
  fi
  if [ "$(stat -c %u -- "$private_dir")" != "$(id -u)" ] || [ "$(stat -c %a -- "$private_dir")" != 700 ]; then
    printf '%s\n' 'Existing private storage has unexpected ownership/permissions. Left unchanged; ask hosting support.'
    ls -ld -- "$private_dir"
    exit 1
  fi
  printf '%s\n' 'Private folder already exists with owner-only permissions. Preserved unchanged.'
else
  umask 077
  mkdir -m 700 -- "$private_dir"
  printf '%s\n' 'Created the private base folder beside public_html (mode 700).'
fi
ls -ld -- "$private_dir"
printf '%s\n' 'No tickets or attachments were read, replaced, or deleted.'
printf '%s\n' 'PHP must still pass the website health check; SSH write access alone is not enough.'
