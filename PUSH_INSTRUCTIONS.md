# Instructions for Pushing to GitHub

Follow these steps to push the project to your GitHub repository:

## Prerequisites

Make sure you have Git installed on your machine. If not, download and install it from [git-scm.com](https://git-scm.com/).

## Setup and Push

1. **Initialize Git repository** (if not already done):
   ```bash
   git init
   ```

2. **Add your GitHub repository as remote**:
   ```bash
   git remote add origin https://github.com/SandeshBro-ux/testing.git
   ```

3. **Add all files to Git**:
   ```bash
   git add .
   ```

4. **Commit the changes**:
   ```bash
   git commit -m "Initial commit: YouTube Video Info Extractor"
   ```

5. **Push to GitHub**:
   If this is a new repository:
   ```bash
   git push -u origin master
   ```
   or if the main branch is named "main":
   ```bash
   git push -u origin main
   ```

## Authentication

If you're asked for authentication, you may need to:

1. Use a Personal Access Token instead of your password (GitHub no longer supports password authentication for Git operations)
2. Generate a token at GitHub: Settings → Developer Settings → Personal Access Tokens
3. Use this token as your password when prompted

## Troubleshooting

If you encounter the error "fatal: refusing to merge unrelated histories", use:
```bash
git pull origin main --allow-unrelated-histories
```
Then resolve any conflicts and push again.

If you're not sure whether to use "main" or "master" as your branch name, check your default branch name with:
```bash
git branch
```
Or check on GitHub under your repository settings. 