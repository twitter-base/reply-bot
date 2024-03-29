#!/bin/sh
set -eu

readonly CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != main ]; then
  echo "You must be on 'main' branch to publish a release, aborting..."
  exit 1
fi

if ! git diff-index --quiet HEAD --; then
  echo "Working tree is not clean, aborting..."
  exit 1
fi

if ! yarn run build; then
  echo "Failed to build dist files, aborting..."
  exit 1
fi

if ! yarn test; then
  echo "Tests failed, aborting..."
  exit 1
fi

yarn run changelog:unreleased

# Only update the package.json version
# We need to update changelog before tagging
# And publishing.
yarn version

if ! yarn run changelog; then
  echo "Failed to update changelog, aborting..."
  exit 1
fi

yarn
yarn build

readonly PACKAGE_VERSION=$(< package.json grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[:space:]')

# Gives user a chance to review and eventually abort.
git add --patch

git commit --message="chore(release): v${PACKAGE_VERSION}"

git push origin HEAD

npm publish

git tag "v$PACKAGE_VERSION"
git push --tags

echo "Pushed package to npm, and also pushed 'v$PACKAGE_VERSION' tag to git repository."
