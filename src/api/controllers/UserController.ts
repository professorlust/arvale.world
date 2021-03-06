import crypto from 'crypto'
import { Request, Response } from 'express'
import Controller from './Controller'
import { User } from '../entities/User'
import { Verification } from '../entities/Verification'
import { hashPassword, signJWT } from '../utils/auth'

class UserController extends Controller {
  create = async (req: Request, res: Response) => {
    const validation = this.validate(req.body, {
      username: 'required|min:3|max:20',
      email: 'required|email',
      password: 'required|min:6|max:64'
    })

    if (validation.fails()) {
      return res.status(422).send(validation.errors)
    }

    let user = await User.findByNameOrEmail(req.body.username, req.body.email)

    if (user) {
      let errors: any = {}

      if (req.body.username == user.name) {
        errors.username = ['Name is already in use.']
      }

      if (req.body.email === user.email) {
        errors.email = ['Email is already in use.']
      }

      return res.status(422).send({ errors })
    }

    const hashedPassword = hashPassword(req.body.password)

    user = await User.create({
      name: req.body.username,
      email: req.body.email,
      password: hashedPassword
    })

    user = await user.save()

    const verification = await Verification.create({
      model: 'User',
      modelId: user.id,
      code: crypto.randomBytes(20).toString('hex')
    })

    verification.save()

    const action_url = this.config.base_url + '/user/verify/' + verification.code

    res.mailer.send('email/default', {
      to: user.email,
      subject: 'Welcome to Arvale.World!',
      preheader: 'Thanks for signing up',
      user,
      message: `Thanks for signing up on Arvale.World. Please verify your account by visiting <a href="${action_url}">${action_url}</a> or clicking the button below.`,
      action_url,
      action_label: 'Verify account'
    }, () => {
      return res.send(user.transform())
    })
  }

  verify = async (req: Request, res: Response) => {
    const validation = this.validate(req.body, {
      email: 'required|email',
      code: 'required'
    })

    if (validation.fails()) {
      return res.status(422).send(validation.errors)
    }

    const verification = await Verification.findOne({ where: { code: req.body.code }})

    if (!verification) {
      return res.status(404).send({ message: 'No verification found.' })
    }

    const user = await User.findOne({ where: { email: req.body.email, id: verification.modelId }})

    if (!user) {
      return res.status(404).send({ message: 'No matching user found.' })
    }

    verification.remove()
    user.verified = true
    user.save()

    const token = signJWT({ id: user.id })

    return res.send({ user: user.transform(), token })
  }
}

export default new UserController
