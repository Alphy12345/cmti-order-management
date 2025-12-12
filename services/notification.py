from models.model import Notification


def create_notification(
    db,
    user_name: str,
    message: str,
    proposal_id: int = None,
    document_id: int = None
):
    notification = Notification(
        user_name=user_name,
        message=message,
        related_proposal_id=proposal_id,
        related_document_id=document_id
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
