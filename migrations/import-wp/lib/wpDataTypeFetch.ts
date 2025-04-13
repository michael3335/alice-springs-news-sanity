// migrations/import-wp/lib/transformToPost.ts
import { BASE_URL, PER_PAGE } from '../constants'
import type {WordPressDataType, WordPressDataTypeResponses} from '../types'

// Basic auth setup in wp-admin -> Users -> Edit User
// This is the WordPress USER name, not the password name
const username = 'Erwin'
const password = '55wO V9N2 YfAC F3zZ O8T1 qM78'

export async function wpDataTypeFetch<T extends WordPressDataType>(
  type: T,
  page: number,
  edit: boolean = false,
): Promise<WordPressDataTypeResponses[T]> {
  const wpApiUrl = new URL(`${BASE_URL}/${type}`)
  wpApiUrl.searchParams.set('page', page.toString())
  wpApiUrl.searchParams.set('per_page', PER_PAGE.toString())
  wpApiUrl.searchParams.set('_embed', 'true') // Include embedded media and taxonomy details

  const headers = new Headers()

  if (edit) {
    // 'edit' context returns pre-processed content and other non-public fields
    wpApiUrl.searchParams.set('context', 'edit')

    headers.set(
      'Authorization',
      'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
    )
  }

  return fetch(wpApiUrl, {headers}).then((res) => (res.ok ? res.json() : null))
}