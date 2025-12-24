module.exports = {
  apps: [
    {
      name: 'gasless-relayer',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=RELAYER_DB=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee --local --ip 0.0.0.0 --port 3000 --persist-to .wrangler/state',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
