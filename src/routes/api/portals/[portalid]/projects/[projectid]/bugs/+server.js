import {json} from '@sveltejs/kit';
import {Task} from "../../../../../util/ZOHOWebService.js";

export async function GET(event) {
    return json({
        data: await Task.fetchAll(event, event.params.portalid, event.params.projectid)
    });
}