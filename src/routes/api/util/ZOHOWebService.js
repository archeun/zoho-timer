import {ZOHO_API_URL, ZOHO_API_URL_V3} from "$env/static/private";

export const httpService = {
    get: async (url, request) => {
        const response = await fetch(url, {
            method: 'GET',
            headers: {'Authorization': `Bearer ${request.cookies.get('zoho-access-token')}`}
        })
        return response.body ? await response.json() : ''
    },
    post: async (url, postData = {}, request) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${request.cookies.get('zoho-access-token')}`},
            body: JSON.stringify(postData)
        })
        return response.body ? await response.json() : ''
    },
    delete: async (url, request) => {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${request.cookies.get('zoho-access-token')}`}
        })
        return response.body ? await response.json() : ''
    },
}

export const Portal = {
    fetchAll: async (request) => {
        const response = await httpService.get(`${ZOHO_API_URL}/portals/`, request)
        return response.portals ?? []
    },
    fetchDetails: async (request, portalId) => {
        return await httpService.get(`${ZOHO_API_URL}/portal/${portalId}/`, request)
    }
}

export const Project = {
    fetchAll: async (request, portalId) => {
        const response = await httpService.get(`${ZOHO_API_URL}/portal/${portalId}/projects/`, request)
        return response.projects ?? []
    },
    searchTasks: async (request, portalId, projectId, index, range, searchTerm) => {
        const url = `${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/search?index=${index}&range=${range}&search_term=${searchTerm}&module=tasks`
        const response = await httpService.get(url, request)
        return response.tasks ?? []
    },
    fetchUsers: async (request, portalId, projectId) => {
        const url = `${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/users/?index=0&range=200`
        const response = await httpService.get(url, request)
        return response.users ?? []
    }
}

export const Task = {
    fetchAll: async (request, portalId, projectId) => {
        const response = await httpService.get(`${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/tasks/`, request)
        return response.tasks ?? []
    },
    fetchTasksToSubmitTime: async (request, portalId, projectId, portalUserId) => {
        const response = await httpService.get(`${ZOHO_API_URL_V3}/portal/${portalId}/projects/${projectId}/timesheet/tasks?user_id=${portalUserId}&page=1&search_term=&type=All&search_offset=0&per_page=200`, request)
        return Array.isArray(response) ? response : []
    }
}

export const Bug = {
    fetchBugsToSubmitTime: async (request, portalId, projectId, portalUserId) => {
        const response = await httpService.get(`${ZOHO_API_URL_V3}/portal/${portalId}/projects/${projectId}/timesheet/issues?user_id=${portalUserId}&page=1&search_term=&type=All&search_offset=0&per_page=200`, request)
        return Array.isArray(response) ? response : []
    }
}

export const SubTask = {
    fetchAll: async (request, portalId, projectId, taskId) => {
        const response = await httpService.get(`${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/tasks/${taskId}/subtasks/`, request)
        return response.tasks ?? []
    }
}

export const Timesheet = {
    saveLogWithTaskId: async (request, portalId, projectId, taskId, timeLog) => {
        let logIdUrlPart = ''
        if (timeLog.logId) {
            logIdUrlPart += `${timeLog.logId}/`
        }
        return await httpService.post(
            `${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/${logIdUrlPart}?date=${timeLog.date}&bill_status=${timeLog.billStatus}&hours=${timeLog.hours}&notes=${timeLog.note}`,
            {},
            request
        )
    },
    addLogWithBugId: async (request, portalId, projectId, bugId, timeLog) => {
        let logIdUrlPart = ''
        if (timeLog.logId) {
            logIdUrlPart += `${timeLog.logId}/`
        }
        return await httpService.post(
            `${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/bugs/${bugId}/logs/${logIdUrlPart}?date=${timeLog.date}&bill_status=${timeLog.billStatus}&hours=${timeLog.hours}&notes=${timeLog.note}`,
            {},
            request
        )
    },
    addGeneralLog: async (request, portalId, projectId, timeLog) => {
        let logIdUrlPart = ''
        if (timeLog.logId) {
            logIdUrlPart += `${timeLog.logId}/`
        }
        return await httpService.post(
            `${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/logs/${logIdUrlPart}?date=${timeLog.date}&name=${timeLog.taskName}&bill_status=${timeLog.billStatus}&hours=${timeLog.hours}&notes=${timeLog.note}`,
            {},
            request
        )
    },
    fetchWeeklyLogsForUser: async (request, portalId, userId, date) => {
        const allTimeLogs = {
            logs: {}, meta: {task: {}, general: {}, bug: {}}
        }

        for (const taskType of ['task', 'general', 'bug']) {
            await Timesheet.fetchWeeklyTimeLogsForUserByTaskType(request, portalId, userId, date, taskType, allTimeLogs)
        }

        allTimeLogs.logs = Object.keys(allTimeLogs.logs).sort().reverse().reduce(
            (obj, key) => {
                obj[key] = allTimeLogs.logs[key];
                return obj;
            },
            {}
        );
        return allTimeLogs
    },
    fetchWeeklyTimeLogsForUserByTaskType: async (request, portalId, userId, date, taskType, allTimeLogs) => {
        let response = await httpService.get(
            `${ZOHO_API_URL}/portal/${portalId}/logs?users_list=${userId}&date=${date}&view_type=week&bill_status=All&component_type=${taskType}&index=0&range=200`,
            request
        )
        const timeLogData = response.timelogs ?? {}
        const timeLogsByDate = timeLogData.date ?? []

        allTimeLogs.meta[taskType].non_billable_hours = timeLogData.non_billable_hours
        allTimeLogs.meta[taskType].billable_hours = timeLogData.billable_hours
        allTimeLogs.meta[taskType].grandtotal = timeLogData.grandtotal

        timeLogsByDate.forEach(timeLogsForDate => {
            if (!allTimeLogs.logs[timeLogsForDate.date]) {
                allTimeLogs.logs[timeLogsForDate.date] = []
            }
            allTimeLogs.logs[timeLogsForDate.date] = allTimeLogs.logs[timeLogsForDate.date].concat(timeLogsForDate[`${taskType}logs`])
        })

    },
    deleteTaskLog: async (request, portalId, projectId, taskId, logId) => {
        return await httpService.delete(
            `${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/${logId}/`,
            request
        )
    },
    deleteBugLog: async (request, portalId, projectId, bugId, logId) => {
        return await httpService.delete(
            `${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/bugs/${bugId}/logs/${logId}/`,
            request
        )
    },
    deleteGeneralLog: async (request, portalId, projectId, logId) => {
        return await httpService.delete(
            `${ZOHO_API_URL}/portal/${portalId}/projects/${projectId}/logs/${logId}/`,
            request
        )
    }
}