import Api from "../../utils/api"
import { Urls } from "../../utils/url"

// group_blueprint.py — GET/POST /groups, PATCH & DELETE /groups/<id>, GET /groups/<id>/members.
// Member picker reuses the existing GET /tickets/users endpoint.
const GroupManagementActions = {
    getGroups: (cb, onError) => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: Urls.groups })
            if (res?.status !== 200) { onError && onError(); return }
            cb && cb(res.data?.data ?? [])
        } catch (error) {
            console.log(error, "getGroups error")
            onError && onError()
        }
    },
    postGroup: (data, cb, onError) => async (dispatch, _) => {
        try {
            const res = await Api.post({ data, url: Urls.groups })
            if (res?.status !== 201 && res?.status !== 200) { onError && onError(res?.data?.msg); return }
            cb && cb(res.data?.data)
        } catch (error) {
            console.log(error, "postGroup error")
            onError && onError('Something went wrong.')
        }
    },
    patchGroup: (groupId, data, cb, onError) => async (dispatch, _) => {
        try {
            const res = await Api.patch({ data, url: `${Urls.groups}/${groupId}` })
            if (res?.status !== 200) { onError && onError(res?.data?.msg); return }
            cb && cb()
        } catch (error) {
            console.log(error, "patchGroup error")
            onError && onError('Something went wrong.')
        }
    },
    deleteGroup: (groupId, cb, onError) => async (dispatch, _) => {
        try {
            const res = await Api.delete({ url: `${Urls.groups}/${groupId}` })
            if (![200, 201, 204].includes(res?.status)) { onError && onError(); return }
            cb && cb()
        } catch (error) {
            console.log(error, "deleteGroup error")
            onError && onError()
        }
    },
    getGroupMembers: (groupId, cb, onError) => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: Urls.groupMembers(groupId) })
            if (res?.status !== 200) { onError && onError(); return }
            cb && cb(res.data?.data ?? [])
        } catch (error) {
            console.log(error, "getGroupMembers error")
            onError && onError()
        }
    },
    getTicketUsersList: (cb, onError) => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: Urls.tickets_users })
            if (res?.status !== 200) { onError && onError(); return }
            const dataAll = (res.data?.data ?? []).map((u) => ({
                value: u.id,
                label: u.label || u.username || String(u.id),
            }))
            cb && cb(dataAll)
        } catch (error) {
            console.log(error, "getTicketUsersList error")
            onError && onError()
        }
    },
}

export default GroupManagementActions
