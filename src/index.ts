import {Hono} from 'hono'
import {auth} from "./auth";
import {WorkerEnv} from "./types/ctx";
import handler from './handler'
import fixed from "./fixed";

const app = new Hono()

export default app

app.get('/', (c) => {
    return c.json({
                      msg: 'welcome to rpics-v2 by RealXLFD'
                  })
})

app.get('/auth', (c) => {
    return auth(c.env as WorkerEnv, c.req) ? c.json({
                                                        code: 0,
                                                        msg: "authorize successfully"
                                                    }) : c.json(fixed.resp.auth_failed)
})

app.put('/add/:album', (c) => {
    const env = c.env as WorkerEnv
    return auth(env, c.req) ? handler.add(env, c) : c.json(fixed.resp.auth_failed)
})

app.get('/get/:hash?', (c) => {
    const env = c.env as WorkerEnv
    return handler.rpics(env, c)
})


app.get('/rpics/:album?', (c) => {
    const env = c.env as WorkerEnv
    return handler.rpics(env, c)
})

app.get('/delete/:hash/:album?', (c) => {
    const env = c.env as WorkerEnv
    return auth(env, c.req) ? handler.delete(env, c) : c.json(fixed.resp.auth_failed)
})